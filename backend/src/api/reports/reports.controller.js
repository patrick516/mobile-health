import prisma from "../../config/db.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

// ─── HELPER: parse date range from query ───────────────────────────────────
const getDateRange = (from, to) => {
  const fromDate = from
    ? new Date(from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);
  return { fromDate, toDate };
};

// ─── HELPER: format date nicely ────────────────────────────────────────────
const fmt = (date) => (date ? new Date(date).toLocaleDateString("en-GB") : "—");

// 1. HOUSEHOLD REPORT

export const getHouseholdReport = async (req, res, next) => {
  try {
    const { from, to, zoneId, villageId } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const households = await prisma.household.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        ...(villageId ? { villageId } : {}),
        ...(zoneId ? { village: { zoneId } } : {}),
      },
      include: {
        village: {
          include: {
            zone: { include: { ta: { include: { district: true } } } },
          },
        },
        members: true,
        registeredBy: { select: { fullName: true, phoneNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const summary = {
      total: households.length,
      totalMembers: households.reduce((s, h) => s + h.members.length, 0),
      activeHouseholds: households.filter((h) => h.status === "ACTIVE").length,
      villages: [...new Set(households.map((h) => h.village?.name))].filter(
        Boolean,
      ).length,
    };

    res.json({
      success: true,
      summary,
      data: households,
      dateRange: { from: fromDate, to: toDate },
    });
  } catch (err) {
    next(err);
  }
};
// 2. REFERRAL REPORT

export const getReferralReport = async (req, res, next) => {
  try {
    const { from, to, zoneId, status } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const referrals = await prisma.referral.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        ...(status ? { status } : {}),
      },
      include: {
        member: {
          include: {
            household: {
              include: {
                village: { include: { zone: true } },
              },
            },
          },
        },
        referringUser: { select: { fullName: true, phoneNumber: true } },
        destinationFacility: { select: { name: true } },
        visit: { select: { visitedAt: true, symptoms: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // CHW performance breakdown
    const chwMap = {};
    for (const r of referrals) {
      const name = r.referringUser?.fullName || "Unknown";
      if (!chwMap[name])
        chwMap[name] = { name, total: 0, completed: 0, missed: 0, pending: 0 };
      chwMap[name].total++;
      if (["TREATED", "COMPLETED"].includes(r.status)) chwMap[name].completed++;
      else if (r.status === "MISSED") chwMap[name].missed++;
      else chwMap[name].pending++;
    }

    // Village breakdown
    const villageMap = {};
    for (const r of referrals) {
      const vName = r.member?.household?.village?.name || "Unknown";
      villageMap[vName] = (villageMap[vName] || 0) + 1;
    }

    const total = referrals.length;
    const completed = referrals.filter((r) =>
      ["TREATED", "COMPLETED"].includes(r.status),
    ).length;
    const missed = referrals.filter((r) => r.status === "MISSED").length;
    const pending = referrals.filter((r) =>
      ["PENDING", "OVERDUE"].includes(r.status),
    ).length;

    res.json({
      success: true,
      summary: {
        total,
        completed,
        missed,
        pending,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      chwBreakdown: Object.values(chwMap).sort((a, b) => b.total - a.total),
      villageBreakdown: Object.entries(villageMap)
        .map(([village, count]) => ({ village, count }))
        .sort((a, b) => b.count - a.count),
      data: referrals,
      dateRange: { from: fromDate, to: toDate },
    });
  } catch (err) {
    next(err);
  }
};

// 3. VISIT REPORT

export const getVisitReport = async (req, res, next) => {
  try {
    const { from, to, chwId, visitType } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const visits = await prisma.visit.findMany({
      where: {
        visitedAt: { gte: fromDate, lte: toDate },
        ...(chwId ? { chwId } : {}),
        ...(visitType ? { visitType } : {}),
      },
      include: {
        member: {
          include: {
            household: { include: { village: { include: { zone: true } } } },
          },
        },
        chw: { select: { fullName: true, phoneNumber: true } },
      },
      orderBy: { visitedAt: "desc" },
    });

    // Symptom counts
    const symptomMap = {};
    for (const v of visits) {
      if (!v.symptoms) continue;
      const arr =
        typeof v.symptoms === "string" ? JSON.parse(v.symptoms) : v.symptoms;
      for (const s of arr) symptomMap[s] = (symptomMap[s] || 0) + 1;
    }

    res.json({
      success: true,
      summary: {
        total: visits.length,
        withReferral: visits.filter((v) => v.referralNeeded).length,
        byType: {
          ROUTINE: visits.filter((v) => v.visitType === "ROUTINE").length,
          SICK: visits.filter((v) => v.visitType === "SICK").length,
          FOLLOW_UP: visits.filter((v) => v.visitType === "FOLLOW_UP").length,
        },
      },
      topSymptoms: Object.entries(symptomMap)
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      data: visits,
      dateRange: { from: fromDate, to: toDate },
    });
  } catch (err) {
    next(err);
  }
};

// 4. IMMUNISATION REPORT

export const getImmunisationReport = async (req, res, next) => {
  try {
    const { from, to, zoneId } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const schedules = await prisma.immunisationSchedule.findMany({
      where: {
        dueDate: { gte: fromDate, lte: toDate },
      },
      include: {
        member: {
          include: {
            household: { include: { village: { include: { zone: true } } } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const total = schedules.length;
    const given = schedules.filter((s) => s.status === "GIVEN").length;
    const overdue = schedules.filter((s) => s.status === "OVERDUE").length;
    const missed = schedules.filter((s) => s.status === "MISSED").length;

    // Per-vaccine breakdown
    const vaccineMap = {};
    for (const s of schedules) {
      const k = s.vaccineCode;
      if (!vaccineMap[k])
        vaccineMap[k] = { vaccine: k, given: 0, due: 0, overdue: 0, missed: 0 };
      vaccineMap[k][s.status.toLowerCase()] =
        (vaccineMap[k][s.status.toLowerCase()] || 0) + 1;
    }

    res.json({
      success: true,
      summary: {
        total,
        given,
        overdue,
        missed,
        coverageRate: total > 0 ? Math.round((given / total) * 100) : 0,
      },
      vaccineBreakdown: Object.values(vaccineMap),
      data: schedules,
      dateRange: { from: fromDate, to: toDate },
    });
  } catch (err) {
    next(err);
  }
};

// 5. EXPORT — EXCEL

export const exportReportExcel = async (req, res, next) => {
  try {
    const { type, from, to } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);
    const wb = new ExcelJS.Workbook();
    wb.creator = "MobileHealth Malawi";
    wb.created = new Date();

    // ── Header style helper ──
    const styleHeader = (row) => {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0D5C4A" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF0D5C4A" } },
        };
      });
      row.height = 22;
    };

    if (type === "households") {
      const households = await prisma.household.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: {
          village: { include: { zone: { include: { ta: true } } } },
          members: true,
          registeredBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const ws = wb.addWorksheet("Households");
      ws.columns = [
        { header: "Household ID", key: "hid", width: 18 },
        { header: "Head of Household", key: "head", width: 24 },
        { header: "Village", key: "village", width: 18 },
        { header: "Zone", key: "zone", width: 18 },
        { header: "TA", key: "ta", width: 18 },
        { header: "Members", key: "members", width: 10 },
        { header: "Structure", key: "structure", width: 14 },
        { header: "Water Source", key: "water", width: 16 },
        { header: "Status", key: "status", width: 12 },
        { header: "Registered By", key: "regBy", width: 20 },
        { header: "Date Registered", key: "date", width: 18 },
      ];
      styleHeader(ws.getRow(1));

      for (const h of households) {
        ws.addRow({
          hid: h.householdNumber,
          head: h.headOfHouseholdName,
          village: h.village?.name || "—",
          zone: h.village?.zone?.name || "—",
          ta: h.village?.zone?.ta?.name || "—",
          members: h.members.length,
          structure: h.structureType,
          water: h.waterSource,
          status: h.status,
          regBy: h.registeredBy?.fullName || "—",
          date: fmt(h.createdAt),
        });
      }

      // Members sheet
      const wsm = wb.addWorksheet("Members");
      wsm.columns = [
        { header: "Full Name", key: "name", width: 22 },
        { header: "Household ID", key: "hid", width: 18 },
        { header: "Village", key: "village", width: 18 },
        { header: "Sex", key: "sex", width: 8 },
        { header: "Date of Birth", key: "dob", width: 16 },
        { header: "Relationship", key: "rel", width: 16 },
        { header: "Pregnant", key: "preg", width: 10 },
        { header: "Status", key: "status", width: 12 },
      ];
      styleHeader(wsm.getRow(1));

      for (const h of households) {
        for (const m of h.members) {
          wsm.addRow({
            name: m.fullName,
            hid: h.householdNumber,
            village: h.village?.name || "—",
            sex: m.sex,
            dob: fmt(m.dateOfBirth),
            rel: m.relationshipToHead,
            preg: m.isPregnant ? "Yes" : "No",
            status: m.status,
          });
        }
      }
    }

    if (type === "referrals") {
      const referrals = await prisma.referral.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: {
          member: { include: { household: { include: { village: true } } } },
          referringUser: { select: { fullName: true } },
          destinationFacility: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const ws = wb.addWorksheet("Referrals");
      ws.columns = [
        { header: "Patient Name", key: "patient", width: 22 },
        { header: "Village", key: "village", width: 18 },
        { header: "Household ID", key: "hid", width: 18 },
        { header: "Referred By (CHW)", key: "chw", width: 22 },
        { header: "Reason", key: "reason", width: 22 },
        { header: "Urgency", key: "urgency", width: 12 },
        { header: "Status", key: "status", width: 14 },
        { header: "Facility", key: "facility", width: 22 },
        { header: "Referred On", key: "refDate", width: 16 },
        { header: "Due By", key: "due", width: 16 },
        { header: "Diagnosis", key: "diagnosis", width: 22 },
        { header: "Treatment Given", key: "treatment", width: 24 },
      ];
      styleHeader(ws.getRow(1));

      for (const r of referrals) {
        ws.addRow({
          patient: r.member?.fullName || "—",
          village: r.member?.household?.village?.name || "—",
          hid: r.member?.household?.householdNumber || "—",
          chw: r.referringUser?.fullName || "—",
          reason: r.reason,
          urgency: r.urgency,
          status: r.status,
          facility: r.destinationFacility?.name || "Not specified",
          refDate: fmt(r.createdAt),
          due: fmt(r.dueBy),
          diagnosis: r.diagnosis || "—",
          treatment: r.treatmentGiven || "—",
        });
      }
    }

    if (type === "visits") {
      const visits = await prisma.visit.findMany({
        where: { visitedAt: { gte: fromDate, lte: toDate } },
        include: {
          member: { include: { household: { include: { village: true } } } },
          chw: { select: { fullName: true } },
        },
        orderBy: { visitedAt: "desc" },
      });

      const ws = wb.addWorksheet("Visits");
      ws.columns = [
        { header: "Patient Name", key: "patient", width: 22 },
        { header: "Village", key: "village", width: 18 },
        { header: "Household ID", key: "hid", width: 18 },
        { header: "CHW", key: "chw", width: 22 },
        { header: "Visit Type", key: "type", width: 16 },
        { header: "Visit Date", key: "date", width: 16 },
        { header: "Temperature", key: "temp", width: 14 },
        { header: "MUAC (mm)", key: "muac", width: 12 },
        { header: "MUAC Status", key: "muacStatus", width: 16 },
        { header: "Symptoms", key: "symptoms", width: 30 },
        { header: "Referral Needed", key: "referral", width: 16 },
        { header: "Notes", key: "notes", width: 30 },
      ];
      styleHeader(ws.getRow(1));

      for (const v of visits) {
        const symptoms = v.symptoms
          ? (typeof v.symptoms === "string"
              ? JSON.parse(v.symptoms)
              : v.symptoms
            ).join(", ")
          : "—";
        ws.addRow({
          patient: v.member?.fullName || "—",
          village: v.member?.household?.village?.name || "—",
          hid: v.member?.household?.householdNumber || "—",
          chw: v.chw?.fullName || "—",
          type: v.visitType,
          date: fmt(v.visitedAt),
          temp: v.temperature || "—",
          muac: v.muacMm || "—",
          muacStatus: v.muacStatus || "—",
          symptoms,
          referral: v.referralNeeded ? "Yes" : "No",
          notes: v.notes || "—",
        });
      }
    }

    if (type === "immunisations") {
      const schedules = await prisma.immunisationSchedule.findMany({
        where: { dueDate: { gte: fromDate, lte: toDate } },
        include: {
          member: { include: { household: { include: { village: true } } } },
        },
        orderBy: { dueDate: "asc" },
      });

      const ws = wb.addWorksheet("Immunisations");
      ws.columns = [
        { header: "Child Name", key: "child", width: 22 },
        { header: "Village", key: "village", width: 18 },
        { header: "Household ID", key: "hid", width: 18 },
        { header: "Vaccine", key: "vaccine", width: 14 },
        { header: "Dose", key: "dose", width: 8 },
        { header: "Due Date", key: "due", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Given On", key: "givenAt", width: 14 },
      ];
      styleHeader(ws.getRow(1));

      for (const s of schedules) {
        ws.addRow({
          child: s.member?.fullName || "—",
          village: s.member?.household?.village?.name || "—",
          hid: s.member?.household?.householdNumber || "—",
          vaccine: s.vaccineCode,
          dose: `Dose ${s.doseNumber}`,
          due: fmt(s.dueDate),
          status: s.status,
          givenAt: fmt(s.givenAt),
        });
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=mobilehealth_${type}_report_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// 6. EXPORT — PDF

export const exportReportPDF = async (req, res, next) => {
  try {
    const { type, from, to } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=mobilehealth_${type}_report_${new Date().toISOString().split("T")[0]}.pdf`,
    );
    doc.pipe(res);

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 70).fill("#0D5C4A");
    doc
      .fillColor("white")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("MobileHealth Malawi", 40, 18);
    doc
      .fontSize(11)
      .font("Helvetica")
      .text(
        `${type.charAt(0).toUpperCase() + type.slice(1)} Report  |  ${fmt(fromDate)} – ${fmt(toDate)}`,
        40,
        44,
      );
    doc.fillColor("black").moveDown(3);

    if (type === "referrals") {
      const referrals = await prisma.referral.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: {
          member: { include: { household: { include: { village: true } } } },
          referringUser: { select: { fullName: true } },
          destinationFacility: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const total = referrals.length;
      const completed = referrals.filter((r) =>
        ["TREATED", "COMPLETED"].includes(r.status),
      ).length;
      const missed = referrals.filter((r) => r.status === "MISSED").length;

      // Summary box
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#0D5C4A")
        .text("Summary", 40, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("black");
      doc.text(
        `Total Referrals: ${total}    Completed: ${completed}    Missed: ${missed}    Completion Rate: ${total > 0 ? Math.round((completed / total) * 100) : 0}%`,
      );
      doc.moveDown(1);

      // Table
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#0D5C4A")
        .text("Referral Details");
      doc.moveDown(0.4);

      const cols = [110, 90, 110, 70, 80, 80];
      const headers = [
        "Patient",
        "Village",
        "CHW",
        "Urgency",
        "Status",
        "Date",
      ];
      let x = 40;
      doc.rect(40, doc.y, 520, 18).fill("#0D5C4A");
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
      let hx = 40;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], hx + 3, doc.y - 14, { width: cols[i] - 3 });
        hx += cols[i];
      }
      doc.moveDown(0.2);
      doc.fillColor("black").font("Helvetica").fontSize(8);

      let rowY = doc.y;
      let odd = true;
      for (const r of referrals) {
        if (rowY > doc.page.height - 80) {
          doc.addPage();
          rowY = 60;
        }
        if (odd) doc.rect(40, rowY - 2, 520, 16).fill("#F0FAF7");
        doc.fillColor("black");
        const row = [
          r.member?.fullName || "—",
          r.member?.household?.village?.name || "—",
          r.referringUser?.fullName || "—",
          r.urgency,
          r.status,
          fmt(r.createdAt),
        ];
        let rx = 40;
        for (let i = 0; i < row.length; i++) {
          doc.text(row[i], rx + 3, rowY, {
            width: cols[i] - 5,
            lineBreak: false,
          });
          rx += cols[i];
        }
        rowY += 16;
        odd = !odd;
      }
    }

    if (type === "households") {
      const households = await prisma.household.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        include: {
          village: { include: { zone: true } },
          members: true,
          registeredBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#0D5C4A")
        .text("Summary");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("black");
      doc.text(
        `Total Households: ${households.length}    Total Members: ${households.reduce((s, h) => s + h.members.length, 0)}    Villages: ${[...new Set(households.map((h) => h.village?.name))].filter(Boolean).length}`,
      );
      doc.moveDown(1);

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#0D5C4A")
        .text("Household List");
      doc.moveDown(0.4);

      const cols = [90, 110, 90, 90, 60, 80];
      const headers = [
        "Household ID",
        "Head",
        "Village",
        "Zone",
        "Members",
        "Registered",
      ];
      doc.rect(40, doc.y, 520, 18).fill("#0D5C4A");
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold");
      let hx = 40;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], hx + 3, doc.y - 14, { width: cols[i] - 3 });
        hx += cols[i];
      }
      doc.moveDown(0.2);
      doc.fillColor("black").font("Helvetica").fontSize(8);

      let rowY = doc.y;
      let odd = true;
      for (const h of households) {
        if (rowY > doc.page.height - 80) {
          doc.addPage();
          rowY = 60;
        }
        if (odd) doc.rect(40, rowY - 2, 520, 16).fill("#F0FAF7");
        doc.fillColor("black");
        const row = [
          h.householdNumber,
          h.headOfHouseholdName,
          h.village?.name || "—",
          h.village?.zone?.name || "—",
          String(h.members.length),
          fmt(h.createdAt),
        ];
        let rx = 40;
        for (let i = 0; i < row.length; i++) {
          doc.text(row[i], rx + 3, rowY, {
            width: cols[i] - 5,
            lineBreak: false,
          });
          rx += cols[i];
        }
        rowY += 16;
        odd = !odd;
      }
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor("#888")
      .text(
        `Generated on ${new Date().toLocaleString()} — MobileHealth Malawi`,
        40,
        doc.page.height - 30,
        { align: "center" },
      );

    doc.end();
  } catch (err) {
    next(err);
  }
};

// 5. PREGNANT WOMEN & ANC REPORT
export const getAncReport = async (req, res, next) => {
  try {
    const { from, to, zoneId, districtId, regionId } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const members = await prisma.householdMember.findMany({
      where: {
        isPregnant: true,
        status: "ACTIVE",
        createdAt: { gte: fromDate, lte: toDate },
        ...(zoneId || districtId || regionId
          ? {
              household: {
                village: {
                  ...(zoneId ? { zoneId } : {}),
                  ...(districtId || regionId
                    ? {
                        zone: {
                          ta: {
                            ...(districtId ? { districtId } : {}),
                            ...(regionId ? { district: { regionId } } : {}),
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
      include: {
        household: {
          include: {
            village: {
              include: {
                zone: {
                  include: {
                    ta: {
                      include: { district: { include: { region: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        ancVisits: { orderBy: { ancNumber: "asc" } },
      },
      orderBy: { fullName: "asc" },
    });

    const total = members.length;
    const allAnc = members.flatMap((m) => m.ancVisits);
    const attended = allAnc.filter((a) => a.status === "ATTENDED").length;
    const overdue = allAnc.filter(
      (a) => a.status === "OVERDUE" || a.status === "MISSED",
    ).length;
    const scheduled = allAnc.filter((a) => a.status === "SCHEDULED").length;

    res.json({
      success: true,
      summary: {
        total,
        totalAncVisits: allAnc.length,
        attended,
        overdue,
        scheduled,
      },
      data: members,
      dateRange: { from: fromDate, to: toDate },
    });
  } catch (err) {
    next(err);
  }
};

// 6. CHILDREN UNDER 5 REPORT
export const getChildrenUnder5Report = async (req, res, next) => {
  try {
    const { from, to, zoneId, districtId, regionId } = req.query;
    const { fromDate, toDate } = getDateRange(from, to);

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const members = await prisma.householdMember.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { dateOfBirth: { gte: fiveYearsAgo } },
          { estimatedAge: { lte: 5 } },
        ],
        createdAt: { gte: fromDate, lte: toDate },
        ...(zoneId || districtId || regionId
          ? {
              household: {
                village: {
                  ...(zoneId ? { zoneId } : {}),
                  ...(districtId || regionId
                    ? {
                        zone: {
                          ta: {
                            ...(districtId ? { districtId } : {}),
                            ...(regionId ? { district: { regionId } } : {}),
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
      include: {
        household: {
          include: {
            village: {
              include: {
                zone: { include: { ta: { include: { district: true } } } },
              },
            },
          },
        },
        immunisationSchedules: {
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const total = members.length;
    const allSchedules = members.flatMap((m) => m.immunisationSchedules);
    const given = allSchedules.filter((s) => s.status === "GIVEN").length;
    const overdue = allSchedules.filter((s) => s.status === "OVERDUE").length;
    const due = allSchedules.filter((s) => s.status === "DUE").length;
    const coverageRate =
      allSchedules.length > 0
        ? Math.round((given / allSchedules.length) * 100)
        : 0;

    res.json({
      success: true,
      summary: {
        total,
        totalSchedules: allSchedules.length,
        given,
        overdue,
        due,
        coverageRate,
      },
      data: members,
      dateRange: { from: fromDate, to: toDate },
    });
  } catch (err) {
    next(err);
  }
};

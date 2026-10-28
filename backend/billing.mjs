import PDFDocument from "pdfkit";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { HttpError, text } from "./validation.mjs";

export function issueBill(store, input, actor) {
  const current = store.read();
  const orderId = input?.orderId || null;
  const requestHash = orderId
    ? null
    : createHash("sha256")
        .update(
          JSON.stringify({
            customerName: input?.customerName,
            customerPhone: input?.customerPhone,
            items: input?.items,
          }),
        )
        .digest("hex");
  const existing =
    orderId && current.bills.find((bill) => bill.orderId === orderId);
  if (existing) return existing;
  if (!orderId) {
    const requestId = text(input?.requestId, "Bill request ID", 10, 100);
    const previous = current.bills.find((bill) => bill.requestId === requestId);
    if (previous) {
      if (previous.requestHash !== requestHash)
        throw new HttpError(409, "Bill details changed. Start a new bill.");
      return previous;
    }
  }
  let lines;
  let customerName;
  let customerPhone;
  let language = input?.language === "ne" ? "ne" : "en";
  if (orderId) {
    const order = current.orders.find((item) => item.id === orderId);
    if (!order) throw new HttpError(404, "Order not found.");
    if (!["Completed", "Delivered"].includes(order.status))
      throw new HttpError(409, "Complete the order before issuing this bill.");
    lines = order.items.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
    }));
    customerName = order.name;
    customerPhone = order.phone;
    language = order.language === "ne" ? "ne" : "en";
  } else {
    customerName = text(
      input?.customerName || "Walk-in customer",
      "Customer name",
      2,
      100,
    );
    customerPhone = text(input?.customerPhone || "", "Customer phone", 0, 20);
    if (
      !Array.isArray(input?.items) ||
      !input.items.length ||
      input.items.length > 30
    )
      throw new HttpError(400, "Select bill items.");
    const seen = new Set();
    lines = input.items.map((item) => {
      if (seen.has(item.productId))
        throw new HttpError(400, "Select each item once.");
      seen.add(item.productId);
      const product = current.products.find((p) => p.id === item.productId);
      if (
        !product ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 1000
      )
        throw new HttpError(400, "Invalid bill item.");
      if (
        product.stockQuantity === null ||
        product.stockQuantity < item.quantity
      )
        throw new HttpError(409, `Insufficient stock for ${product.name}.`);
      if (product.priceIsEstimate)
        throw new HttpError(
          409,
          `Confirm ${product.name}'s price before billing.`,
        );
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      };
    });
  }
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const bill = {
    id: `ME-B${String(current.bills.length + 1).padStart(6, "0")}`,
    requestId: orderId ? null : input.requestId,
    requestHash,
    orderId,
    customerName,
    customerPhone,
    language,
    lines,
    subtotal: total,
    total,
    taxStatus: "pending",
    issuedAt: new Date().toISOString(),
    issuedBy: actor.username,
  };
  const products = orderId
    ? current.products
    : current.products.map((product) => {
        const line = lines.find((item) => item.productId === product.id);
        if (!line) return product;
        const stockQuantity = product.stockQuantity - line.quantity;
        return {
          ...product,
          stockQuantity,
          available: stockQuantity > 0,
          stockVersion: product.stockVersion + 1,
        };
      });
  const sales = orderId
    ? current.sales
    : [
        ...current.sales,
        {
          id: `SALE-${bill.id}`,
          date: bill.issuedAt,
          source: "WALK_IN",
          total,
          paymentMethod: "CASH",
          customerName,
          items: lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            quantity: line.quantity,
            price: line.unitPrice,
          })),
          staff: actor.username,
        },
      ];
  store.commit({
    ...current,
    products,
    bills: [...current.bills, bill],
    sales,
  });
  return bill;
}

export function billPdf(bill) {
  return new Promise((resolve, reject) => {
    const width = 226.77; // 80 mm receipt roll
    const height = Math.max(
      300,
      230 +
        bill.lines.reduce(
          (sum, line) => sum + 25 + 12 * Math.ceil(line.name.length / 35),
          0,
        ),
    );
    const doc = new PDFDocument({
      size: [width, height],
      margin: 15,
      compress: true,
    });
    doc
      .registerFont(
        "devanagari",
        fileURLToPath(
          new URL("./seed/NotoSansDevanagari-Regular.ttf", import.meta.url),
        ),
      )
      .font("Helvetica");
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const mixed = (value, options = {}) => {
      if (/^[\u0900-\u097f\s।!?]+$/.test(String(value))) {
        doc.font("devanagari").text(value, options).font("Helvetica");
        return;
      }
      const parts = String(value)
        .split(/([\u0900-\u097f]+)/)
        .filter(Boolean);
      for (const [index, part] of parts.entries())
        doc
          .font(/[\u0900-\u097f]/.test(part) ? "devanagari" : "Helvetica")
          .text(part, {
            ...options,
            continued: index < parts.length - 1 || options.continued === true,
          });
      doc.font("Helvetica");
    };
    const ne = bill.language === "ne";
    const center = (value, size = 9) => {
      doc.fontSize(size);
      mixed(value, { align: "center" });
    };
    center("MACHHAPUCHHREE", 12);
    center("ELECTRONICS", 9);
    center("Lekhnath, Pokhara, Nepal");
    center("9806600444");
    doc.moveDown(0.7);
    center(ne ? "बिक्री रसिद" : "SALE RECEIPT", 11);
    doc.moveDown(0.5);
    doc.fontSize(8);
    mixed(`${ne ? "बिल" : "Bill"}: ${bill.id}`);
    mixed(
      `${ne ? "मिति" : "Date"}: ${new Date(bill.issuedAt).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })}`,
    );
    mixed(`${ne ? "ग्राहक" : "Customer"}: `, { continued: true });
    mixed(bill.customerName);
    if (bill.orderId) mixed(`${ne ? "अर्डर" : "Order"}: ${bill.orderId}`);
    doc.moveDown(0.5);
    doc.text("--------------------------------------------");
    for (const line of bill.lines) {
      doc.fontSize(9);
      mixed(line.name, { width: width - 30 });
      doc
        .fontSize(8)
        .text(
          `${line.quantity} x Rs. ${line.unitPrice.toLocaleString("en-US")}`,
          { continued: true },
        );
      doc.text(
        `Rs. ${(line.quantity * line.unitPrice).toLocaleString("en-US")}`,
        { align: "right" },
      );
      doc.moveDown(0.35);
    }
    doc.text("--------------------------------------------");
    doc.fontSize(10);
    if (ne) {
      const y = doc.y;
      doc.font("devanagari").text("जम्मा", 15, y, { width: 65 });
      doc
        .font("Helvetica")
        .text(`Rs. ${bill.total.toLocaleString("en-US")}`, 80, y, {
          width: width - 95,
          align: "right",
        });
    } else
      doc.text(`TOTAL  Rs. ${bill.total.toLocaleString("en-US")}`, {
        align: "right",
      });
    doc.moveDown(0.5);
    doc.fontSize(7);
    mixed(
      ne
        ? "कर विवरण पुष्टि हुन बाँकी छ। यो कर बिजक होइन।"
        : "Tax details pending confirmation. This is a sale receipt, not a tax invoice.",
      { align: "center" },
    );
    doc.moveDown(0.8);
    center(ne ? "आउनुभएकोमा धन्यवाद!" : "Thank you for visiting!", 8);
    doc.end();
  });
}

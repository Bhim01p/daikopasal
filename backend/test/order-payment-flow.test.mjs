import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "./app-fixture.mjs";
import { createOrderEmail } from "../email.mjs";

test("guest pickup and delivery orders keep payment and status states consistent", async () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "me-order-payment-"));
  const salt = "0123456789abcdef0123456789abcdef";
  const password = "order-payment-test-only";
  const app = createApp({
    dataFile: path.join(directory, "store.json"),
    username: "testadmin",
    passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    emailTransport: null,
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const call = async (route, method = "GET", input, headers = {}) => {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(input ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  };
  try {
    const login = await call("/api/admin/login", "POST", {
      username: "testadmin",
      password,
    });
    assert.equal(login.status, 200);
    const admin = { Cookie: login.headers.get("set-cookie").split(";")[0] };
    const source = (await call("/api/products")).data.products[0];
    const created = await call(
      "/api/admin/products",
      "POST",
      {
        ...source,
        name: "Payment flow test phone",
        stockQuantity: 3,
        isSample: false,
      },
      admin,
    );
    assert.equal(created.status, 201);
    const product = created.data.product;
    const orderInput = (fulfillmentMethod, expectedTotal) => ({
      name: "Order Payment Test",
      email: `${randomUUID()}@example.com`,
      phone: "9806600444",
      items: [{ productId: product.id, quantity: 1 }],
      requestId: randomUUID(),
      expectedTotal,
      fulfillmentMethod,
      paymentMethod: "MANUAL_QR",
      ...(fulfillmentMethod === "DELIVERY"
        ? {
            deliveryAddress: {
              province: "Gandaki",
              district: "Kaski",
              city: "Pokhara",
              area: "Lekhnath",
              address: "Sample Street 1",
            },
          }
        : {}),
    });
    const pickup = await call(
      "/api/orders",
      "POST",
      orderInput("PICKUP", product.price),
    );
    assert.equal(pickup.status, 201);
    const pickupOrder = pickup.data.order;
    const pickupToken = { "X-Order-Token": pickupOrder.receiptToken };
    assert.equal(pickupOrder.payment.status, "PENDING");
    assert.equal(
      (
        await call(
          `/api/admin/orders/${pickupOrder.id}/payment`,
          "PATCH",
          { status: "PAID" },
          admin,
        )
      ).status,
      409,
    );
    const submitted = await call(
      `/api/orders/${pickupOrder.id}/payment`,
      "PATCH",
      { reference: "TEST-REF-123" },
      pickupToken,
    );
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.order.payment.status, "VERIFICATION_PENDING");
    assert.equal(
      (
        await call(
          `/api/admin/orders/${pickupOrder.id}/payment`,
          "PATCH",
          { status: "REJECTED" },
          admin,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/api/admin/orders/${pickupOrder.id}/payment`,
          "PATCH",
          { status: "PAID" },
          admin,
        )
      ).status,
      409,
    );
    const resubmitted = await call(
      `/api/orders/${pickupOrder.id}/payment`,
      "PATCH",
      { reference: "TEST-REF-456" },
      pickupToken,
    );
    assert.equal(resubmitted.status, 200);
    assert.equal(resubmitted.data.order.payment.reviewedAt, undefined);
    assert.equal(
      (
        await call(
          `/api/admin/orders/${pickupOrder.id}/payment`,
          "PATCH",
          { status: "PAID" },
          admin,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/api/orders/${pickupOrder.id}/payment`,
          "PATCH",
          { reference: "TEST-REF-789" },
          pickupToken,
        )
      ).status,
      409,
    );
    const customerReceipt = await call(
      `/api/orders/${pickupOrder.id}`,
      "GET",
      undefined,
      pickupToken,
    );
    assert.equal(customerReceipt.status, 200);
    assert.equal(customerReceipt.data.order.payment.verifiedBy, undefined);
    assert.equal(customerReceipt.data.order.payment.reviewedBy, undefined);
    const adminReceipt = (
      await call("/api/admin/orders", "GET", undefined, admin)
    ).data.orders.find((item) => item.id === pickupOrder.id);
    assert.equal(adminReceipt.payment.verifiedBy, "testadmin");
    const email = createOrderEmail(pickupOrder, "received");
    assert.match(email.message.text, /Pay using the shop QR/);
    assert.doesNotMatch(email.message.text, /No online payment has been taken/);

    const deliveryInput = orderInput("DELIVERY", product.price + 175);
    assert.equal(
      (
        await call("/api/orders", "POST", {
          ...deliveryInput,
          expectedTotal: product.price,
        })
      ).status,
      409,
    );
    const delivery = await call("/api/orders", "POST", deliveryInput);
    assert.equal(delivery.status, 201);
    const deliveryOrder = delivery.data.order;
    assert.equal(deliveryOrder.fulfillment, "DELIVERY");
    assert.equal(deliveryOrder.deliveryFee, 175);
    assert.equal(deliveryOrder.total, product.price + 175);
    assert.match(
      createOrderEmail(deliveryOrder, "received").message.text,
      /Home delivery/,
    );
    assert.doesNotMatch(
      createOrderEmail(deliveryOrder, "received").message.text,
      /Shop pickup:/,
    );
    const deliveryToken = { "X-Order-Token": deliveryOrder.receiptToken };
    assert.equal(
      (
        await call(
          `/api/orders/${deliveryOrder.id}/payment`,
          "PATCH",
          { reference: "DELIVERY-REF-123" },
          deliveryToken,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/api/admin/orders/${deliveryOrder.id}/payment`,
          "PATCH",
          { status: "PAID" },
          admin,
        )
      ).status,
      200,
    );
    const status = (value) =>
      call(
        `/api/admin/orders/${deliveryOrder.id}`,
        "PATCH",
        { status: value },
        admin,
      );
    assert.equal((await status("Ready for pickup")).status, 409);
    assert.equal((await status("Confirmed")).status, 200);
    const preparing = await status("Preparing");
    assert.equal(preparing.status, 200, preparing.data.error);
    assert.equal((await status("Out for delivery")).status, 200);
    assert.equal((await status("Delivered")).status, 200);
    assert.equal((await status("Cancelled")).status, 409);
    assert.equal(
      (
        await call(
          `/api/orders/${deliveryOrder.id}/payment`,
          "PATCH",
          { reference: "LATE-REF-123" },
          deliveryToken,
        )
      ).status,
      409,
    );

    const cancelled = (
      await call("/api/orders", "POST", orderInput("PICKUP", product.price))
    ).data.order;
    const cancelledToken = { "X-Order-Token": cancelled.receiptToken };
    assert.equal(
      (
        await call(
          `/api/admin/orders/${cancelled.id}`,
          "PATCH",
          { status: "Cancelled" },
          admin,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/api/orders/${cancelled.id}/payment`,
          "PATCH",
          { reference: "CANCELLED-REF-123" },
          cancelledToken,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          `/api/admin/orders/${cancelled.id}/payment`,
          "PATCH",
          { status: "PAID" },
          admin,
        )
      ).status,
      409,
    );
  } finally {
    await new Promise((resolve) => app.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});

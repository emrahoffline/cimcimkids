import { NextResponse } from "next/server";
import { createOrder, getProducts } from "@/lib/db";
import { sendOrderNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.kvkkConsent) {
    return NextResponse.json(
      { error: "KVKK onayı gereklidir." },
      { status: 400 }
    );
  }

  const items = body.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Sepet boş." }, { status: 400 });
  }

  const products = await getProducts();
  let serverTotal = 0;
  const validatedItems = items.map(
    (item: {
      productId: string;
      name: string;
      price: number;
      quantity: number;
      image: string;
    }) => {
      const product = products.find((p) => p.id === item.productId);
      const price = product?.price ?? item.price;
      serverTotal += price * item.quantity;
      return {
        productId: item.productId,
        name: product ? (product.nameTr || item.name) : item.name,
        price,
        quantity: item.quantity,
        image: product?.image ?? item.image,
      };
    }
  );

  const orderNumber = `AB-${Date.now().toString().slice(-6)}`;
  const order = await createOrder({
    orderNumber,
    customerEmail: body.email || "guest@aryabamboo.com",
    customerName: body.name || "Misafir",
    customerPhone: body.phone,
    items: validatedItems,
    total: serverTotal,
    status: "pending_payment",
    shippingAddress: body.address,
  });

  try {
    await sendOrderNotificationEmail(order);
  } catch (err) {
    console.error("[email] Sipariş bildirimi gönderilemedi:", err);
  }

  return NextResponse.json(order, { status: 201 });
}

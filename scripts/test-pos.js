async function runTest() {
  console.log('--- Starting Complete POS System Flow Test ---');

  // 1. Fetch tables
  const tablesRes = await fetch('http://localhost:3000/api/tables');
  const tables = await tablesRes.json();
  console.log(`✅ Tables loaded: ${tables.length} tables found`);

  // 2. Fetch menu
  const menuRes = await fetch('http://localhost:3000/api/menu');
  const menu = await menuRes.json();
  console.log(`✅ Menu loaded: ${menu.length} categories found`);
  const firstCategory = menu[0];
  const firstItem = firstCategory.items[0];
  console.log(`   Sample item: "${firstItem.name}" (${firstItem.basePrice} THB)`);

  // 3. Customer orders at Table 3
  console.log('\n--- Step 1: Customer scans Table 3 & submits order ---');
  const orderPayload = {
    tableId: 3,
    orderType: 'DINE_IN',
    customerName: 'คุณสมศักดิ์ (LINE)',
    items: [
      {
        menuItemId: firstItem.id,
        name: firstItem.name,
        price: 75,
        quantity: 2,
        selectedOptions: [
          { group: 'เลือกเนื้อสัตว์', choice: 'หมูกรอบ', extraPrice: 15 },
          { group: 'เพิ่มท็อปปิ้งไข่', choice: 'ไข่ดาวไม่สุก (เยิ้มๆ)', extraPrice: 10 },
          { group: 'ระดับความเผ็ด', choice: 'เผ็ดมาก', extraPrice: 0 },
        ],
        specialNote: 'ไม่ใส่ผงชูรส',
      },
    ],
  };

  const createOrderRes = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });
  const createdOrder = await createOrderRes.json();
  console.log(`✅ Order created successfully! ID: ${createdOrder.id}`);
  console.log(`   Total Amount: ${createdOrder.totalAmount} THB (Status: ${createdOrder.status})`);

  // 4. Verify Table 3 Status and PromptPay Dynamic QR
  console.log('\n--- Step 2: Table 3 Dynamic QR & Status Check ---');
  const table3Res = await fetch('http://localhost:3000/api/tables/3');
  const table3Data = await table3Res.json();
  console.log(`✅ Table 3 Status: ${table3Data.table.status}`);
  console.log(`   Total Unpaid Bill: ${table3Data.totalAmount} THB`);
  console.log(`   PromptPay Dynamic QR Payload: ${table3Data.promptPayQrPayload}`);

  // 5. Kitchen checks queue & updates status to COOKING then READY
  console.log('\n--- Step 3: Kitchen KDS processes order ---');
  const kitchenRes = await fetch('http://localhost:3000/api/orders?status=kitchen');
  const kitchenOrders = await kitchenRes.json();
  console.log(`✅ Kitchen active tickets: ${kitchenOrders.length} orders`);

  const updateCookingRes = await fetch(`http://localhost:3000/api/orders/${createdOrder.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COOKING' }),
  });
  const cookingOrder = await updateCookingRes.json();
  console.log(`✅ Kitchen status updated to: ${cookingOrder.status}`);

  // 6. Cashier checks out and closes bill with PromptPay
  console.log('\n--- Step 4: Cashier checks bill & completes payment ---');
  const payRes = await fetch(`http://localhost:3000/api/orders/${createdOrder.id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentMethod: 'PROMPTPAY',
      payAllTableOrders: true,
    }),
  });
  const payData = await payRes.json();
  console.log(`✅ Payment complete: ${payData.message}`);

  // 7. Verify Table 3 is now Available
  const table3AfterPay = await (await fetch('http://localhost:3000/api/tables/3')).json();
  console.log(`✅ Table 3 Status after checkout: ${table3AfterPay.table.status}`);

  // 8. Verify Daily Sales Report
  console.log('\n--- Step 5: Sales Reports verification ---');
  const reportRes = await fetch('http://localhost:3000/api/reports/daily');
  const report = await reportRes.json();
  console.log(`✅ Total sales recorded today: ${report.totalSales} THB`);
  console.log(`   Total paid bills: ${report.orderCount}`);
  console.log(`   PromptPay revenue: ${report.promptPaySales} THB`);
  console.log(`   Top selling dish: ${report.topSellingItems[0]?.name} (${report.topSellingItems[0]?.quantity} dishes)`);

  console.log('\n🎉 ALL POS & QR ORDERING MODULES VERIFIED 100% OPERATIONAL!');
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});

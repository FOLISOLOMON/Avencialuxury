import { allocateStockFIFO, AvailableBatchStock } from "./fifo";

function testFIFOAllocation() {
  console.log("Running FIFO Inventory Allocation Tests...");

  const batches: AvailableBatchStock[] = [
    {
      batchId: "batch-1",
      batchReference: "Batch A",
      unitCost: 30,
      quantityRemaining: 10,
      purchaseDate: new Date("2026-01-01"),
    },
    {
      batchId: "batch-2",
      batchReference: "Batch B",
      unitCost: 40,
      quantityRemaining: 20,
      purchaseDate: new Date("2026-01-10"),
    },
  ];

  const result = allocateStockFIFO(batches, 15);

  console.assert(result.isFullyAllocated === true, "Should be fully allocated");
  console.assert(result.totalQuantityAllocated === 15, "Should allocate 15 units");
  console.assert(result.totalCost === 500, "10 * 30 + 5 * 40 should equal 500");
  console.assert(result.allocations.length === 2, "Should span 2 batches");

  console.assert(result.allocations[0].batchId === "batch-1", "Batch A first");
  console.assert(result.allocations[0].quantity === 10, "10 units from Batch A");
  console.assert(result.allocations[1].batchId === "batch-2", "Batch B second");
  console.assert(result.allocations[1].quantity === 5, "5 units from Batch B");

  console.log("✅ FIFO Allocation Tests Passed!");
}

testFIFOAllocation();

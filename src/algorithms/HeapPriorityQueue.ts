import { HeapItem } from '../types';

/**
 * Max-Heap Priority Queue for Smart Waste Collection
 * Implements binary heap where root element always has the maximum Urgency Score.
 * 
 * Time Complexities:
 * - Insert: O(log N)
 * - Extract Max: O(log N)
 * - Peek Max: O(1)
 * - Build Heap: O(N)
 */
export class MaxHeapPriorityQueue {
  private heap: HeapItem[] = [];

  constructor(initialItems: HeapItem[] = []) {
    if (initialItems.length > 0) {
      this.heap = [...initialItems];
      this.buildHeap();
    }
  }

  public get size(): number {
    return this.heap.length;
  }

  public getItems(): HeapItem[] {
    return [...this.heap];
  }

  public peek(): HeapItem | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  public insert(item: HeapItem): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  public extractMax(): HeapItem | null {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return max;
  }

  public clear(): void {
    this.heap = [];
  }

  public buildHeap(): void {
    // Start from last non-leaf node and sink down
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.bubbleDown(i);
    }
  }

  public updateUrgency(binId: string, newUrgencyScore: number, newFill: number, newHoursToFull: number): void {
    const index = this.heap.findIndex(item => item.binId === binId);
    if (index === -1) return;

    const oldScore = this.heap[index].urgencyScore;
    this.heap[index].urgencyScore = newUrgencyScore;
    this.heap[index].fillLevel = newFill;
    this.heap[index].predictedHoursToFull = newHoursToFull;

    if (newUrgencyScore > oldScore) {
      this.bubbleUp(index);
    } else {
      this.bubbleDown(index);
    }
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].urgencyScore > this.heap[parentIndex].urgencyScore) {
        this.swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let largest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (
        leftChild < length &&
        this.heap[leftChild].urgencyScore > this.heap[largest].urgencyScore
      ) {
        largest = leftChild;
      }

      if (
        rightChild < length &&
        this.heap[rightChild].urgencyScore > this.heap[largest].urgencyScore
      ) {
        largest = rightChild;
      }

      if (largest !== index) {
        this.swap(index, largest);
        index = largest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Generates a structured tree representation for ADSA visualizer
   */
  public getTreeRepresentation(): Array<{
    item: HeapItem;
    index: number;
    parentIndex: number | null;
    leftIndex: number | null;
    rightIndex: number | null;
    depth: number;
  }> {
    return this.heap.map((item, index) => {
      const parentIndex = index === 0 ? null : Math.floor((index - 1) / 2);
      const leftIndex = 2 * index + 1 < this.heap.length ? 2 * index + 1 : null;
      const rightIndex = 2 * index + 2 < this.heap.length ? 2 * index + 2 : null;
      const depth = Math.floor(Math.log2(index + 1));

      return {
        item,
        index,
        parentIndex,
        leftIndex,
        rightIndex,
        depth,
      };
    });
  }
}

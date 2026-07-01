import os from 'os';

export type TaskCost = 1 | 2 | 3;

export interface Task<T> {
  id: string;
  cost: TaskCost;
  execute: () => Promise<T>;
}

export class Orchestrator<T> {
  private queue: Array<{ task: Task<T>; resolve: (value: T) => void; reject: (err: any) => void }> = [];
  private activeCount = 0;
  private activeCost = 0;
  private maxCost = Math.max(os.cpus().length, 4); // E.g., on a 4-core machine, capacity is 4.

  /**
   * Adds a task to the orchestrator queue and returns a promise that resolves
   * when the task completes.
   */
  public enqueue(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.tick();
    });
  }

  /**
   * Evaluates the queue and starts tasks if there is available capacity.
   */
  private tick() {
    if (this.queue.length === 0) return;

    // Find the first task in the queue that fits within the remaining cost capacity.
    // If no task fits, but activeCount is 0 (we are completely idle), we force start the first task
    // to prevent deadlocks (e.g., a cost 5 task on a 4-core machine).
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      if (this.activeCost + item.task.cost <= this.maxCost || this.activeCount === 0) {
        // Remove from queue
        this.queue.splice(i, 1);
        this.runTask(item);
        
        // Decrementing i is not necessary since we return/break, but we want to continue 
        // starting as many tasks as possible.
        i--;
      }
    }
  }

  private async runTask(item: { task: Task<T>; resolve: (value: T) => void; reject: (err: any) => void }) {
    this.activeCount++;
    this.activeCost += item.task.cost;

    try {
      // Execute the actual promise
      const result = await item.task.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeCount--;
      this.activeCost -= item.task.cost;
      this.tick();
    }
  }
}

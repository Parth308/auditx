import { describe, it, expect } from 'vitest';
import { Orchestrator, type TaskCost } from '../../src/runners/orchestrator.js';
import os from 'os';

describe('Orchestrator', () => {
  it('should run tasks concurrently up to maxCost limit', async () => {
    // Determine the maxCost used by the orchestrator (at least 4)
    const maxCost = Math.max(os.cpus().length, 4);

    const orchestrator = new Orchestrator<number>();
    
    // We'll create multiple cost 1 tasks.
    let concurrentCount = 0;
    let maxConcurrent = 0;
    
    const createTask = (id: string, cost: TaskCost) => {
      return {
        id,
        cost,
        execute: async () => {
          concurrentCount++;
          maxConcurrent = Math.max(maxConcurrent, concurrentCount);
          // Small delay to allow tasks to overlap
          await new Promise((resolve) => setTimeout(resolve, 50));
          concurrentCount--;
          return 1;
        }
      };
    };

    // Enqueue more tasks than maxCost
    const promises = [];
    for (let i = 0; i < maxCost + 2; i++) {
      promises.push(orchestrator.enqueue(createTask(`t${i}`, 1)));
    }

    await Promise.all(promises);

    // It should have run at most maxCost concurrently
    expect(maxConcurrent).toBe(maxCost);
  });

  it('should force start a task even if its cost exceeds maxCost if activeCount is 0', async () => {
    const orchestrator = new Orchestrator<number>();
    
    let executed = false;
    
    // We will bypass TypeScript temporarily to inject a higher cost task
    const heavyTask = {
      id: 'heavy',
      cost: 100 as TaskCost, // Violates type but tests runtime logic
      execute: async () => {
        executed = true;
        return 42;
      }
    };

    const result = await orchestrator.enqueue(heavyTask);
    expect(executed).toBe(true);
    expect(result).toBe(42);
  });

  it('should handle task rejections correctly', async () => {
    const orchestrator = new Orchestrator<number>();
    
    const failTask = {
      id: 'fail',
      cost: 1 as TaskCost,
      execute: async () => {
        throw new Error('Task failed');
      }
    };

    await expect(orchestrator.enqueue(failTask)).rejects.toThrow('Task failed');
    
    // Check that it can still run tasks after a failure
    const successTask = {
      id: 'success',
      cost: 1 as TaskCost,
      execute: async () => 10
    };
    
    const result = await orchestrator.enqueue(successTask);
    expect(result).toBe(10);
  });

  it('should handle synchronous throws without getting into infinite loop', async () => {
    const orchestrator = new Orchestrator<number>();
    
    const syncThrowTask = {
      id: 'syncThrow',
      cost: 1 as TaskCost,
      execute: () => {
        throw new Error('Sync throw');
      }
    };

    await expect(orchestrator.enqueue(syncThrowTask)).rejects.toThrow('Sync throw');
  });
});

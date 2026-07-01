// ai-spaghetti.ts

// 1. Meaningless Wrapper
export function logMessage(msg: string) {
  return console.log(msg);
}

// 2. Redundant Promise
export function getStaticValue() {
  return new Promise((resolve) => resolve(42));
}

// 3. Silent Swallower
export function riskyOperation() {
  try {
    throw new Error('Uh oh');
  } catch (e) {
  }
}

// 4. Redundant Boolean
export function checkAccess(isAdmin: boolean) {
  if (isAdmin === true) {
    return true;
  }
  return false;
}

// 5. Redundant Await
export async function fetchData() {
  const promise = Promise.resolve('data');
  return await promise;
}

// 6. forEach Mutation
export function processItems(items: number[]) {
  const result: number[] = [];
  items.forEach(i => {
    result.push(i * 2);
  });
  return result;
}

// 7. High Complexity God Function (for lizard)
export function calculateTax(income: number, state: string, age: number, isMarried: boolean, dependents: number, hasBusiness: boolean) {
  let tax = 0;
  if (income > 0) {
    if (state === 'CA') {
      tax = 0.1;
      if (age > 65) {
        tax -= 0.02;
      }
      if (isMarried) {
        tax -= 0.01;
      }
    } else if (state === 'NY') {
      tax = 0.09;
      if (age > 65) {
        tax -= 0.01;
      }
    } else if (state === 'TX') {
      tax = 0.0;
    } else if (state === 'FL') {
      tax = 0.0;
      if (hasBusiness) {
        tax += 0.05;
      }
    } else {
      tax = 0.05;
      if (income > 100000) {
        tax += 0.02;
        if (isMarried) {
          tax -= 0.01;
        }
      }
    }
    
    if (dependents > 0) {
      if (dependents === 1) tax -= 0.01;
      if (dependents === 2) tax -= 0.02;
      if (dependents > 2) tax -= 0.03;
      if (dependents > 5) tax -= 0.05; // Bump CCN
      if (dependents > 10) tax -= 0.1; // Bump CCN
    }
  }
  return tax;
}

// 8. Math.random for crypto
export function generateSessionId() {
  return Math.random().toString(36);
}

// 9. eval usage
export function runCode(code: string) {
  return eval(code);
}

// 10. Any cast
export function castData(x: unknown) {
  return x as any;
}

// 11. Empty catch (silent swallow) with variable assignment
export function riskyOp2() {
  try {
    throw new Error("fail");
  } catch (e) {
    const err = e;
  }
}

// 12. console.log leak
export function debugInfo() {
  console.log("Here is some info");
}

import { AxeResults } from 'axe-core';

declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toHaveNoViolations(): void;
    }
  }
  
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): Promise<R>;
    }
  }
}

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
}
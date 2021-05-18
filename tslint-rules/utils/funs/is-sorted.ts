export const isSorted = (array: ReadonlyArray<string>) =>
  array.every(
    (s: string, i: number, arr: ReadonlyArray<string>) => !i || s >= arr[i - 1]
  );

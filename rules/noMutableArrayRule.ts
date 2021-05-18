// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';

/**
 * Rule: no-mutable-array (has-fixer)
 * Disallows usage of mutable array.
 *
 * Rationale
 * Mutable structures are not compatible with pure functionnal programming.
 *
 * Config
 * 1 argument may be optionally provided "use-type-reference".
 * If provided, enforces usage of syntax `ReadonlyArray<T>` instead of `readonly T[]`.
 *
 * By default, enforces usage of syntax `readonly T[]` instead of `ReadonlyArray<T>`.
 *
 * Config examples
 * `"no-mutable-array": true`
 * `"no-mutable-array": [true, "use-type-reference"]`
 *
 * Code examples:
 * `"rules": { "no-mutable-array": true }`
 * Passes
 * ```typescript
 * const readonlyArray:readonly string[] = [];
 * const readonlyComplexeArray:readonly { a: string; b: number; }[] = [{a:'a', b: 2}];
 * ```
 *
 * Fails
 * ```typescript
 * const mutableArray: string[] = [];
 * const typeReferenceArray:ReadonlyArray<string> = [];
 * ```
 *
 * `"rules": { "no-mutable-array": [true, "use-type-reference"] }`
 *
 * Passes
 * ```typescript
 * const typeReferenceArray:ReadonlyArray<string> = [];
 * const typeReferenceArrayComplexe:ReadonlyArray<{ a: string; b: number; }> = [{a:'a', b: 2}];
 * ```
 *
 * Fails
 * ```typescript
 * const mutableArray: string[] = [];
 * const readonlyComplexeArray:readonly { a: string; b: number; }[] = [{a:'a', b: 2}];
 * ```
 */

export class Rule extends Lint.Rules.AbstractRule {
  // tslint:disable-next-line:no-mutable-array
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk(this.getOptions()));
  }
}

type ArrayType = ts.TypeOperatorNode | ts.ArrayTypeNode | ts.TypeReferenceNode;

function walk(options) {
  const useTypeReference = 'use-type-reference' === options?.ruleArguments[0];
  const fix = useTypeReference ? toTypeReference : toTypeOperator;

  return (ctx: Lint.WalkContext<any>): void => {
    ts.forEachChild(ctx.sourceFile, function controlNode(node: ts.Node): void {
      if (shouldControl(node)) {
        controlRule(node as ArrayType);
        return;
      }
      ts.forEachChild(node, controlNode);

      function controlRule(arrayType: ArrayType): void {
        const start = arrayType.getStart();
        const width = arrayType.getWidth();

        // T[]
        if (ts.SyntaxKind.ArrayType === arrayType.kind) {
          ctx.addFailureAt(
            start,
            width,
            `'mutable-array' are not allowed`,
            new Lint.Replacement(start, width, fix(arrayType.elementType))
          );
          return;
        }

        // ReadonlyArray<T>
        if (
          ts.SyntaxKind.TypeReference === arrayType.kind &&
          !useTypeReference
        ) {
          ctx.addFailureAt(
            start,
            width,
            `'ReadonlyArray<T>' are not allowed, use 'readonly T[]'`,
            new Lint.Replacement(start, width, fix(arrayType.typeArguments[0]))
          );
          return;
        }

        // readonly T[]
        if (ts.SyntaxKind.TypeOperator === arrayType.kind && useTypeReference) {
          ctx.addFailureAt(
            start,
            width,
            `'readonly T[]' are not allowed, use 'ReadonlyArray<T>'`,
            new Lint.Replacement(
              start,
              width,
              fix((arrayType.type as ts.ArrayTypeNode).elementType)
            )
          );
          return;
        }
      }
    });
  };
}

function shouldControl(node: ts.Node): boolean {
  return (
    (ts.SyntaxKind.TypeReference === node.kind &&
      'ReadonlyArray' === node.getFirstToken().getText()) ||
    (ts.SyntaxKind.TypeOperator === node.kind &&
      'readonly' === node.getFirstToken().getText() &&
      ts.SyntaxKind.ArrayType === (node as ts.TypeOperatorNode).type.kind) ||
    ts.SyntaxKind.ArrayType === node.kind
  );
}

function toTypeOperator(type: ts.TypeNode): string {
  return `readonly ${type.getText()}[]`;
}
function toTypeReference(type: ts.TypeNode): string {
  return `ReadonlyArray<${type.getText()}>`;
}

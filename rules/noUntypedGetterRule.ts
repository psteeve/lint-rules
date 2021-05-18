// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING =
    "'untyped-getter' are not allowed, please provided an explicit return type to: ";

  // tslint:disable-next-line:no-mutable-array
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<any>): void {
  ts.forEachChild(ctx.sourceFile, function controlNode(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.ClassDeclaration) {
      controlRule(node as ts.ClassDeclaration);
    }
    ts.forEachChild(node, controlNode);

    function controlRule({ name, members }: ts.ClassDeclaration): void {
      if (!name.text.includes('Component') || !members) {
        return;
      }
      [...members]
        .filter(member => ts.isGetAccessor(member))
        .filter((getter: ts.AccessorDeclaration) => !getter.type)
        .forEach((getter: ts.AccessorDeclaration) => {
          ctx.addFailureAt(
            getter.getStart(),
            getter.getWidth(),
            Rule.FAILURE_STRING + getter.getText()
          );
        });
    }
  });
}

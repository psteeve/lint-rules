// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING = 'no duplicate module import declaration : ';

  // tslint:disable-next-line:no-mutable-array
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<any>): void {
  const identifierNames = new Set();

  ts.forEachChild(ctx.sourceFile, function controlNode(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.ClassDeclaration) {
      controlRule(node as ts.ClassDeclaration);
    }
    ts.forEachChild(node, controlNode);

    function controlRule({ name, decorators }: ts.ClassDeclaration): void {
      if (!name.text.includes('Module') && decorators === undefined) {
        return;
      }

      const decorator = decorators?.[0] as ts.Decorator;

      const argument = (decorator?.expression as ts.CallExpression)
        ?.arguments?.[0] as ts.ObjectLiteralExpression;
      const property = argument?.properties?.[0] as ts.PropertyAssignment;
      const elements = (property?.initializer as ts.ArrayLiteralExpression)
        ?.elements;

      elements?.forEach(element => {
        if (identifierNames.has(element.getText())) {
          const start = element.getStart();
          const width = element.getWidth();

          ctx.addFailureAt(
            start,
            width,
            Rule.FAILURE_STRING + '\n' + element.getText(),
            new Lint.Replacement(start, width, '')
          );
        } else {
          identifierNames.add(element.getText());
        }
      });
    }
  });
}

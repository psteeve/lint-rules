// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';
import { isSorted } from './utils';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING =
    "'ordered-module-import-properties' import properties are not in alphabetic order: ";

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

    function controlRule({ name, decorators }: ts.ClassDeclaration): void {
      if (!name.text.includes('Module') || !decorators) {
        return;
      }
      const decorator = decorators[0] as ts.Decorator;
      const expression = decorator.expression as ts.CallExpression;
      const firstArgument = expression
        .arguments[0] as ts.ObjectLiteralExpression;
      const template = firstArgument?.properties
        .filter((prop: ts.PropertyAssignment) => ts.isPropertyAssignment(prop))
        .find(
          (prop: ts.PropertyAssignment) =>
            (prop.name as ts.Identifier).escapedText === 'imports'
        ) as ts.PropertyAssignment;

      const elements = (template?.initializer as ts.ArrayLiteralExpression)
        ?.elements;

      if (!elements?.length) {
        return;
      }

      const propsName: ReadonlyArray<string> = elements?.map(a =>
        getElementName(a)
      );

      if (!isSorted(propsName)) {
        const textToReplace = [...propsName].sort().join(',\n');

        ctx.addFailureAt(
          template.getStart(),
          template.getWidth(),
          Rule.FAILURE_STRING,
          new Lint.Replacement(
            template.getStart(),
            template.getWidth(),
            `imports: [${textToReplace}]`
          )
        );
      }
    }
  });
}

function getElementName(element: any): string {
  if (ts.isIdentifier(element)) {
    return element.escapedText as string;
  }

  if (ts.isCallExpression(element)) {
    const elExpression = element.expression as ts.PropertyAccessExpression;
    const identifier = (elExpression.expression as ts.Identifier)
      .escapedText as string;
    const exprName = (elExpression.name as ts.Identifier).escapedText as string;
    const elArgs = element.arguments?.map(
      (e: ts.Identifier | ts.StringLiteral | ts.ArrayLiteralExpression) => {
        if (ts.isStringLiteral(e)) {
          return `'${e.text}'`;
        }

        if (ts.isIdentifier(e)) {
          return e.escapedText;
        }

        if (ts.isArrayLiteralExpression(e)) {
          return `[${(e as ts.ArrayLiteralExpression).elements
            .map((elt: ts.Identifier) => elt.escapedText)
            .join(', ')}]`;
        }
      }
    );

    return `${identifier}.${exprName}(${elArgs.join(', ')})`;
  }
}

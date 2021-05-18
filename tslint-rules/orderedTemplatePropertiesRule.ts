// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';
import { isSorted } from './utils';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING =
    "'ordered-template-properties' template properties are not in alphabetic order: ";

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
      if (!name.text.includes('Component') || !decorators) {
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
            (prop.name as ts.Identifier).escapedText === 'template'
        ) as ts.PropertyAssignment;

      const text = (template?.initializer as ts.NoSubstitutionTemplateLiteral)
        ?.rawText;

      if (!text) {
        return;
      }

      const splitedText = text.split('\n');

      const limitFirstPart = splitedText.findIndex(s => s.includes('<'));

      const firstPart = splitedText.slice(0, limitFirstPart + 1);

      const limitLastPart = splitedText.findIndex(s => s.endsWith('>'));

      const lastPart = splitedText.slice(limitLastPart, splitedText.length);

      const textToSorted = splitedText.slice(limitFirstPart + 1, limitLastPart);

      const inputParts = textToSorted.filter(value => value.includes('['));

      const outputParts = textToSorted.filter(value => value.includes('('));

      if (!isSorted(inputParts) || !isSorted(outputParts)) {
        const sortedInput = sortPropertiesParts(inputParts);
        const sortedOutput = sortPropertiesParts(outputParts);

        const textToReplace = firstPart
          .concat(sortedInput)
          .concat(sortedOutput)
          .concat(lastPart)
          .join('\n');

        ctx.addFailureAt(
          template.getStart(),
          template.getWidth(),
          Rule.FAILURE_STRING,
          new Lint.Replacement(
            template.getStart(),
            template.getWidth(),
            `template: \`${textToReplace}\``
          )
        );
      }
    }
  });
}
function sortPropertiesParts(
  parts: ReadonlyArray<string>
): ReadonlyArray<string> {
  const properties = parts.map(part => part.split('='));
  const propertiesMap = new Map();

  properties.forEach(([key, value]) => propertiesMap.set(key, value));
  const sortedProperties = Array.from(propertiesMap.keys()).sort();
  const sortedPropertiesText = [];

  sortedProperties.forEach(prop =>
    sortedPropertiesText.push(`${prop}=${propertiesMap.get(prop)}`)
  );
  return sortedPropertiesText;
}

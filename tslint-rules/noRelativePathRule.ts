// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.AbstractRule {
  // tslint:disable-next-line:no-mutable-array
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<any>): void {
  ts.forEachChild(ctx.sourceFile, function controlNode(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      controlRule(node as ts.ImportDeclaration);
    }

    function controlRule(importDeclaration: ts.ImportDeclaration): void {
      const moduleSpecifier = importDeclaration.moduleSpecifier;
      // tslint:disable-next-line:no-magic-numbers
      const start = moduleSpecifier.getStart() + 1;
      // tslint:disable-next-line:no-magic-numbers
      const width = moduleSpecifier.getWidth() - 2;
      const preferPath = getFixPath(
        ctx.sourceFile.fileName,
        moduleSpecifier.getText()
      );
      if (moduleSpecifier.getText().startsWith("'../")) {
        ctx.addFailureAt(
          start,
          width,
          `'relative path' are not allowed: ${moduleSpecifier.getText()}, could be ${preferPath}`,
          new Lint.Replacement(start, width, preferPath)
        );
      }
      if ("'.'" === moduleSpecifier.getText()) {
        ctx.addFailureAt(
          start,
          width,
          `'relative path' are not allowed, and a possible cyclic dependancy: ${moduleSpecifier.getText()}`
        );
      }
      return;
    }
  });
}

function getFixPath(fileName: string, path: string) {
  const pathArray = path.replace(/'/g, '').split('/');
  const startPath = tryToFindAPath(fileName, findLevel(pathArray));
  const endPath = pathArray.filter(x => '..' !== x);
  return [...startPath, ...endPath].join('/');
}

function tryToFindAPath(path: string, level: number) {
  const partsOfPath = path.split('/');
  const newPartsOfPath = partsOfPath.slice(
    partsOfPath.findIndex(parts => 'app' === parts)
  );
  return newPartsOfPath.slice(0, newPartsOfPath.length - level - 1);
}

function findLevel(pathArray: ReadonlyArray<string>): number {
  return pathArray.filter(x => '..' === x).length;
}

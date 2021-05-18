// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING =
    'only decorator must precede another decorator: ';

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
      const reversedMembers = reverse(removeFirstPrivateMembers(members));

      const lastDecoratorPosition = reversedMembers.findIndex(
        member => ts.isPropertyDeclaration(member) && member.decorators
      );

      // No decorators found
      if (lastDecoratorPosition === -1) {
        return;
      }

      // running backwards because the array is reversed
      for (
        let i = reversedMembers.length - 1;
        lastDecoratorPosition <= i;
        i--
      ) {
        const getter = reversedMembers[i];
        if (!getter.decorators) {
          ctx.addFailureAt(
            getter.getStart(),
            getter.getWidth(),
            Rule.FAILURE_STRING + '\n' + getter.getText()
          );
        }
      }
    }
  });
}

function isPrivateMember(classElement: ts.ClassElement): boolean {
  if (undefined === classElement?.modifiers) {
    return false;
  }
  return [...classElement?.modifiers].some(
    modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword
  );
}

function removeFirstPrivateMembers(
  members: ts.NodeArray<ts.ClassElement>
): ReadonlyArray<ts.ClassElement> {
  let newMembers: ReadonlyArray<ts.ClassElement> = [];
  const membersArray = [...members];
  let i = 0;
  while (isPrivateMember(membersArray[i])) {
    i++;
  }
  for (let j = i; j < membersArray.length; j++) {
    newMembers = [...newMembers, membersArray[j]];
  }

  return newMembers;
}

function reverse<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
  return array.map((_, i) => array[array.length - 1 - i]);
}

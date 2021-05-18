// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING = 'only accessor must follow another accessor';

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

      const position = members.findIndex(member => ts.isAccessor(member));

      const restMembers: ReadonlyArray<ts.ClassElement> = members.slice(
        position
      );

      let faultyMembers: ReadonlyArray<ts.ClassElement> = [];

      let restMembersIsAccessor = true;

      if (position === -1 || members.length - 1 <= position) {
        return;
      }
      restMembers.forEach((member, index) => {
        if (
          ts.isAccessor(member) &&
          restMembers[index + 1] &&
          !ts.isAccessor(restMembers[index + 1])
        ) {
          faultyMembers = [...faultyMembers, member];
        }

        if (ts.isAccessor(member)) {
          return; /* skip this one */
        }
        restMembersIsAccessor = false;
      });

      if (!restMembersIsAccessor) {
        faultyMembers.forEach(accessor => {
          ctx.addFailureAt(
            accessor.getStart(),
            accessor.getWidth(),
            Rule.FAILURE_STRING
          );
        });
      }
    }
  });
}

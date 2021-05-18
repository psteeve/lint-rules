// tslint:disable:file-name-casing
import * as Lint from 'tslint';
import * as ts from 'typescript';
import { isSorted } from './utils';

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING =
    "'ordered-enum-properties' enum properties are not in alphabetic order: ";

  // tslint:disable-next-line:no-mutable-array
  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<any>): void {
  ts.forEachChild(ctx.sourceFile, function controlNode(node: ts.Node): void {
    if (node.kind === ts.SyntaxKind.EnumDeclaration) {
      controlRule(node as ts.EnumDeclaration);
    }

    function controlRule({ name, members }: ts.EnumDeclaration): void {
      if (!name.text.includes('Enum') && !members) {
        return;
      }

      const filteredMembers: ts.NodeArray<ts.EnumMember> = ([...members].sort(
        (a: ts.EnumMember, b: ts.EnumMember) => {
          const memberName = (a.name as ts.Identifier).escapedText as string;
          const otherMemberName = (b.name as ts.Identifier)
            .escapedText as string;
          if (memberName < otherMemberName) {
            return -1;
          }
          if (memberName > otherMemberName) {
            return 1;
          }
          return 0;
        }
      ) as unknown) as ts.NodeArray<ts.EnumMember>;
      // tslint:disable-next-line:no-mutable-array
      const membersName: string[] = members.map(
        (member: ts.EnumMember) =>
          (member.name as ts.Identifier).escapedText as string
      );

      if (!isSorted(membersName)) {
        // tslint:disable-next-line:no-parameter-reassignment
        const nodeName = name.escapedText as string;

        const textToReplace = `export enum ${nodeName} {
                                ${filteredMembers
                                  .map(x => x.getFullText())
                                  .join(',')}\n};`;
        ctx.addFailureAt(
          node.getStart(),
          node.getWidth(),
          Rule.FAILURE_STRING,
          new Lint.Replacement(node.getStart(), node.getWidth(), textToReplace)
        );
      }
    }
  });
}

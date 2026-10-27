import { Schema } from "effect";

const number = "(?:0|[1-9]\\d*)";
const Version = Schema.String.check(
  Schema.isPattern(new RegExp(`^${number}\\.${number}\\.${number}(?:-rc\\.[1-9]\\d*)?$`)),
);

export function releasePolicy(input: string) {
  const version = Schema.decodeUnknownSync(Version)(input);
  const releaseCandidate = version.includes("-rc.");
  const tag = `v${version}`;
  return {
    version,
    tag,
    releaseCandidate,
    createArgs: [
      "release",
      "create",
      tag,
      "--verify-tag",
      "--draft",
      ...(releaseCandidate ? ["--prerelease", "--latest=false"] : []),
    ],
    publishArgs: releaseCandidate ? [] : ["release", "edit", tag, "--draft=false", "--latest"],
    pushToMain: !releaseCandidate,
  };
}

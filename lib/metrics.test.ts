import { RecordStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateEvaluation } from "./metrics";

describe("calculateEvaluation", () => {
  it("calculates database-style reconciliation metrics", () => {
    const result = calculateEvaluation([
      { groundTruth: "MATCH", status: RecordStatus.RECONCILED },
      { groundTruth: "EXCEPTION", status: RecordStatus.EXCEPTION },
      { groundTruth: "MATCH", status: RecordStatus.UNRESOLVED },
      { groundTruth: "DUPLICATE", status: RecordStatus.UNRESOLVED },
    ]);
    expect(result).toMatchObject({ total: 4, reconciled: 1, exceptions: 1, unresolved: 2, correct: 3, matchRate: 0.25, exceptionRate: 0.25, accuracy: 0.75 });
  });

  it("does not divide by zero for an empty dataset", () => expect(calculateEvaluation([])).toMatchObject({ total: 0, matchRate: 0, exceptionRate: 0, accuracy: 0 }));
});

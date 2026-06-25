export interface CMMIMetrics {
  iterationName?: string;
  startDate?: string;
  endDate?: string;
  developmentRate: {
    rate: number;
    effort: number;
    size: number;
    status: 'green' | 'yellow' | 'red';
    totalItems: number;
    totalEffort: number;
    totalSize: number;
    stdDeviation: number;
    items: Array<{
      project: string;
      type: string;
      id: string;
      parentId?: string;
      isw: string;
      level: string;
      size: number;
      sizeSource: 'field' | 'discussion' | 'manual' | 'none';
      sizeEdited?: number;
      status: string;
      title: string;
      planned: number;
      effort: number;
      rate: number;
      createdDate?: string;
      closedDate?: string;
      changedDate?: string;
      tasks: {
        id: number;
        title: string;
        assignedTo: string;
        originalEstimate: number;
        completedWork: number;
        remainingWork: number;
        type?: string;
        discipline?: string;
        createdDate?: string;
        closedDate?: string;
        changedDate?: string;
        status?: string;
      }[];
      relatedBugs?: Array<{
        id: number;
        title: string;
        assignedTo: string;
        originalEstimate: number;
        completedWork: number;
        remainingWork: number;
        createdDate?: string;
        closedDate?: string;
        changedDate?: string;
        status?: string;
        tags?: string;
        tasks: Array<{
          id: number;
          title: string;
          assignedTo: string;
          originalEstimate: number;
          completedWork: number;
          remainingWork: number;
          type?: string;
          discipline?: string;
          createdDate?: string;
          closedDate?: string;
          changedDate?: string;
          status?: string;
        }>;
      }>;
    }>;
  };
  effortVariance: {
    planned: number;
    actual: number;
    rate: number;
    stdDeviation: number;
    avgIndividualRate: number;
    absoluteRate: number;
    status: 'green' | 'yellow' | 'red';
  };
  rework: {
    reqEffort: number;
    reqRework: number;
    bugRework: number;
    totalRework: number;
    rate: number;
    status: 'green' | 'yellow' | 'red';
  };
  defectDensity: {
    bugs: number;
    size: number;
    density: number;
    status: 'green' | 'yellow' | 'red';
  };
  defectRemovalEfficiency: {
    totalBugs: number;
    closedOnTime: number;
    closedLate: number;
    proposed: number;
    resolved: number;
    active: number;
    rate: number;
    status: 'green' | 'yellow' | 'red';
    bugsList: Array<{
      project: string;
      iteration: string;
      startDate: string;
      endDate: string;
      parentType: string;
      parentId: string;
      isw: string;
      bugId: string;
      title: string;
      createdDate: string;
      closedDate: string;
      status: string;
      alignment: 'on-time' | 'late' | 'none';
      isKanban?: boolean;
      tags?: string;
      classification?: 'testing' | 'uat' | 'produccion';
    }>;
  };
  escapedBugs?: {
    bugsTesting: number;
    bugsUat: number;
    bugsProd: number;
    totalBugs: number;
    rate: number;
    status: 'green' | 'yellow' | 'red';
    stdDeviation: number;
    bugsList: Array<{
      project: string;
      iteration: string;
      bugId: string;
      title: string;
      createdDate: string;
      closedDate?: string;
      status: string;
      isw: string;
      classification: 'testing' | 'uat' | 'produccion';
      isSprintRelated?: boolean;
      tags?: string;
    }>;
    rows?: Array<{
      project: string;
      iteration: string;
      fullIteration: string;
      testing: number;
      uat: number;
      produccion: number;
      total: number;
      rate: number;
    }>;
  };
  riskCriticality?: {
    risks: Array<{
      id: number;
      title: string;
      impact: number;
      probability: number;
      score: number;
    }>;
    totalScore: number;
  };
  testExecution?: {
    totalTestPoints: number;
    executed: number;
    notExecuted: number;
    passed: number;
    passedEnTiempo: number;
    passedFueraDeTiempo: number;
    failed: number;
    blocked: number;
    notApplicable: number;
    rate: number; // run rate %
    status: 'green' | 'yellow' | 'red';
    testPoints: Array<{
      planId: number;
      planName: string;
      planStartDate?: string;
      planEndDate?: string;
      suiteId: number;
      suiteName: string;
      projectName?: string;
      testPointId: number;
      testCaseId: number;
      testCaseTitle: string;
      outcome: string;
      tester: string;
      lastUpdatedDate?: string;
      onTime?: boolean;
      isExecutedInSprint?: boolean;
    }>;
  };
  satisfactoryTests?: {
    total: number;
    passedEnTiempo: number;
    passedFueraDeTiempo: number;
    failed: number;
    blocked: number;
    notApplicable: number;
    notExecuted: number;
    paused: number;
    rate: number;
    status: 'green' | 'yellow' | 'red';
  };
  allSprintItems?: Array<{
    id: string;
    type: string;
    title: string;
    assignedTo: string;
    project: string;
    size: number;
    status: string;
    closedDate?: string;
    changedDate?: string;
    parentId?: string;
  }>;
}

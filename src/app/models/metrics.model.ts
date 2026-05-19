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
  riskCriticality: {
    risks: Array<{
      id: string;
      title: string;
      impact: number;
      probability: number;
      score: number;
    }>;
    totalScore: number;
  };
}

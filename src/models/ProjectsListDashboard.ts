import _ from "lodash";
import { Id, Ref, D2Api, SelectedPick, D2DataSetSchema } from "../types/d2-api";
import { PeopleOrBenefit } from "./dataElementsSet";
import { Config } from "./Config";
import { getRefs } from "../utils/dhis2";
import { Maybe } from "../types/utils";

interface DashboardProject {
    id: Id;
    orgUnit: Ref;
    dataElements: DataElement[];
    openingDate: Date;
    closingDate: Date;
}

export interface DataElement {
    id: Id;
    name: string;
    code: string;
    peopleOrBenefit: PeopleOrBenefit;
    hasPairedDataElements: boolean;
}

export interface ProjectsListDashboard {
    dates: Maybe<{ opening: Date; closing: Date }>;
    dataElements: Record<"all" | "people" | "benefit", DataElement[]>;
    orgUnits: Ref[];
}

const query = {
    organisationUnits: {
        id: true,
        children: { id: true },
    },
    dataSets: {
        id: true,
        code: true,
        dataInputPeriods: { openingDate: true, closingDate: true },
        dataSetElements: {
            dataElement: {
                id: true,
                name: true,
                code: true,
                dataElementGroups: { code: true },
                attributeValues: { attribute: { id: true }, value: true },
            },
        },
    },
} as const;

export async function getProjectsListDashboard(
    api: D2Api,
    config: Config,
    condition: Condition
): Promise<ProjectsListDashboard> {
    const metadata = await getMetadata(api, condition);

    const projects: DashboardProject[] = _(metadata.dataSets)
        .map(dataSet => getProject(config, metadata, dataSet))
        .compact()
        .value();

    const dataElements = _(projects)
        .flatMap(project => project.dataElements)
        .uniqBy(dataElement => dataElement.id)
        .sortBy(dataElement => dataElement.name)
        .value();

    const dataElementsByType = {
        all: dataElements,
        people: dataElements.filter(de => de.peopleOrBenefit === "people"),
        benefit: dataElements.filter(de => de.peopleOrBenefit === "benefit"),
    };

    const openingDate = _.min(projects.map(project => project.openingDate));
    const closingDate = _.min(projects.map(project => project.closingDate));

    const dashboardProjects: ProjectsListDashboard = {
        orgUnits: metadata.orgUnits,
        dates: openingDate && closingDate ? { opening: openingDate, closing: closingDate } : null,
        dataElements: dataElementsByType,
    };

    return dashboardProjects;
}

type DataSetApi = SelectedPick<D2DataSetSchema, typeof query.dataSets>;

interface Metadata {
    orgUnits: Ref[];
    dataSets: DataSetApi[];
}

type Condition =
    | { type: "project"; id: Id }
    | { type: "country"; id: Id }
    | { type: "awardNumber"; value: string };

async function getMetadata(api: D2Api, condition: Condition): Promise<Metadata> {
    const metadata$ = api.metadata.get({
        organisationUnits: {
            fields: query.organisationUnits,
            filter:
                condition.type === "country" || condition.type === "project"
                    ? { id: { eq: condition.id } }
                    : { code: { $like: condition.value } },
        },
        dataSets: {
            fields: query.dataSets,
            filter: {
                code: { like$: "_ACTUAL" },
                ...(condition.type === "country" || condition.type === "project"
                    ? { "organisationUnits.path": { like: condition.id } }
                    : { "organisationUnits.code": { $like: condition.value } }),
            },
        },
    });

    const { organisationUnits, dataSets } = await metadata$.getData();

    const orgUnits =
        condition.type === "country"
            ? _.flatMap(organisationUnits, ou => ou.children)
            : getRefs(organisationUnits);

    return { orgUnits, dataSets };
}

function getProject(
    config: Config,
    metadata: Metadata,
    dataSet: DataSetApi
): DashboardProject | null {
    const orgUnitById = _.keyBy(metadata.orgUnits, ou => ou.id);
    const projectId = dataSet.code.split("_")[0];
    const orgUnit = orgUnitById[projectId];
    if (!orgUnit) return null;

    const openingDateString = _.min(dataSet.dataInputPeriods.map(dip => dip.openingDate));
    const closingDateString = _.min(dataSet.dataInputPeriods.map(dip => dip.closingDate));
    if (!openingDateString || !closingDateString) return null;

    const { people: peopleCode, benefit: benefitCode } = config.base.dataElementGroups;

    const dataElements = _(dataSet.dataSetElements)
        .map((dse): DataElement | null => {
            const { dataElement } = dse;
            const degCodes = dataElement.dataElementGroups.map((deg: any) => deg.code);
            const peopleOrBenefit = degCodes.includes(peopleCode)
                ? "people"
                : degCodes.includes(benefitCode)
                ? "benefit"
                : null;
            if (!peopleOrBenefit) return null;

            const hasPairedDataElements = _(dataElement.attributeValues).some(
                de =>
                    de.attribute.id === config.attributes.pairedDataElement.id &&
                    !_.isEmpty(de.value)
            );

            return {
                id: dataElement.id,
                name: dataElement.name,
                code: dataElement.code,
                peopleOrBenefit,
                hasPairedDataElements,
            };
        })
        .compact()
        .value();

    return {
        id: orgUnit.id,
        orgUnit: { id: orgUnit.id },
        openingDate: new Date(openingDateString),
        closingDate: new Date(closingDateString),
        dataElements,
    };
}

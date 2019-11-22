import _ from "lodash";
import moment from "moment";
import { generateUid } from "d2/uid";
import { D2DataSet } from "d2-api";
import Project from "./Project";
import { getMonthsRange, toISOString } from "../utils/date";
import "../utils/lodash-mixins";
import { RecursivePartial } from "../types/utils";

function getOrgUnitId(orgUnit: { path: string }): string {
    const id = _.last(orgUnit.path.split("/"));
    if (id) return id;
    else throw new Error(`Invalid path: ${orgUnit.path}`);
}

export default class ProjectDb {
    constructor(public project: Project) {}

    async save() {
        const { project } = this;
        const { api, config } = project;
        const { attributes } = project.config;

        const attributesByCode = _(attributes).keyBy(attr => attr.code);
        const { startDate, endDate } = project;
        const parentOrgUnit = project.organisationUnit;

        if (!startDate || !endDate) {
            throw new Error("Missing dates");
        } else if (!parentOrgUnit) {
            throw new Error("No parent org unit");
        }

        const baseAttributeValues = [
            {
                value: "true",
                attribute: {
                    id: attributesByCode.getOrFail(config.base.attributes.createdByApp).id,
                },
            },
        ];

        const dashboard = {
            id: generateUid(),
            name: project.name,
        };

        const parentOrgUnitId = getOrgUnitId(parentOrgUnit);

        const orgUnit = {
            id: generateUid(),
            name: project.name,
            code: project.code,
            shortName: project.shortName,
            description: project.description,
            parent: { id: parentOrgUnitId },
            openingDate: toISOString(startDate.startOf("month")),
            closedDate: toISOString(endDate.endOf("month")),
            attributeValues: [
                ...baseAttributeValues,
                {
                    value: dashboard.id,
                    attribute: {
                        id: attributesByCode.getOrFail(config.base.attributes.projectDashboard).id,
                    },
                },
            ],
        };

        const targetPeriods = getMonthsRange(startDate, endDate).map(date => ({
            period: { id: date.format("YYYYMM") },
            openingDate: toISOString(startDate.startOf("month")),
            closingDate: toISOString(endDate.endOf("month")),
        }));

        const dataSetAttributeValues = [
            ...baseAttributeValues,
            {
                value: orgUnit.id,
                attribute: {
                    id: attributesByCode.getOrFail(config.base.attributes.orgUnitProject).id,
                },
            },
        ];

        const dataSetTargetMetadata = this.getDataSetsMetadata(orgUnit, {
            name: `${project.name} Target`,
            code: "TARGET",
            openFuturePeriods: endDate.diff(moment(), "month") + 1,
            dataInputPeriods: targetPeriods,
            attributeValues: dataSetAttributeValues,
        });

        const actualPeriods = getMonthsRange(startDate, endDate).map(date => ({
            period: { id: date.format("YYYYMM") },
            openingDate: toISOString(date.startOf("month")),
            closingDate: toISOString(
                date
                    .startOf("month")
                    .add(1, "month")
                    .date(6)
            ),
        }));

        const dataSetActualMetadata = this.getDataSetsMetadata(orgUnit, {
            name: `${project.name} Actual`,
            code: "ACTUAL",
            openFuturePeriods: 1,
            dataInputPeriods: actualPeriods,
            attributeValues: dataSetAttributeValues,
        });

        const metadata = flattenPayloads([
            { organisationUnits: [orgUnit], dashboards: [dashboard] },
            dataSetTargetMetadata,
            dataSetActualMetadata,
        ]);

        const response = await api.metadata.post(metadata).getData();

        return { response, project: this.project };
    }

    getDataSetsMetadata(orgUnit: { id: string }, baseDataSet: RecursivePartial<D2DataSet>) {
        const { project } = this;
        const dataSetId = generateUid();

        const dataElementsInSectors = project.dataElements
            .getSelected()
            .filter(de => project.sectors.some(sector => sector.id === de.sectorId));

        const dataSetElements = dataElementsInSectors.map(dataElement => ({
            dataSet: { id: dataSetId },
            dataElement: { id: dataElement.id },
            categoryCombo: { id: dataElement.categoryComboId },
        }));

        const sections = project.sectors.map((sector, index) => {
            return {
                id: generateUid(),
                dataSet: { id: dataSetId },
                sortOrder: index,
                name: sector.displayName,
                dataElements: project.dataElements
                    .getSelected({ sectorId: sector.id })
                    .map(de => ({ id: de.id })),
                greyedFields: [],
            };
        });

        const dataSet = {
            id: dataSetId,
            description: project.description,
            periodType: "Monthly",
            dataElementDecoration: true,
            renderAsTabs: true,
            organisationUnits: [{ id: orgUnit.id }],
            dataSetElements,
            timelyDays: 0,
            expiryDays: 1,
            formType: "DEFAULT",
            sections: sections.map(section => ({ id: section.id })),
            ...baseDataSet,
            code: baseDataSet.code ? `${dataSetId}_${baseDataSet.code}` : undefined,
        };

        return { dataSets: [dataSet], sections };
    }
}

/* Accumulate Array<{key1: [...], key2: [...]}> into {key1: [...], key2: [...]} */
export function flattenPayloads(payloads: object[]): object {
    return _(payloads)
        .map(_.toPairs)
        .flatten()
        .groupBy(([key, _values]) => key)
        .mapValues(pairs =>
            _(pairs)
                .flatMap(([_key, values]) => values)
                .uniqBy("id")
                .map(obj => _.omitBy(obj, (_v, k) => k === "key" || k.startsWith("$")))
                .value()
        )
        .value();
}

import React from "react";
import { StepProps } from "../../../pages/project-wizard/ProjectWizard";
import DataElementsTable, { FieldName } from "../data-elements/DataElementsTable";
import { Id } from "../../../types/d2-api";
import { FilterKey } from "../data-elements/DataElementsFilters";
import { DataElement } from "../../../models/dataElementsSet";
import i18n from "../../../locales";
import Dropdown, { DropdownProps } from "../../dropdown/Dropdown";
import LocalHospitalIcon from "@material-ui/icons/LocalHospital";
import NotInterestedIcon from "@material-ui/icons/NotInterested";
import Project from "../../../models/Project";
import { renderJoin } from "../../../utils/react";
import { useSectionsSidebar } from "../../sections-sidebar/sections-sidebar-hooks";
import SectionsSidebar from "../../sections-sidebar/SectionsSidebar";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { showSelectionMessage } from "../data-elements/table-utils";

const DisaggregationStep: React.FC<StepProps> = ({ project, onChange }) => {
    const snackbar = useSnackbar();
    const { items, sectorId, setSector, onSectorsMatchChange } = useSectionsSidebar(project);
    const dataElementsSet = project.dataElementsSelection;

    const disaggregationItems = React.useMemo(() => {
        return [
            { value: "false", text: i18n.t("No") },
            { value: "true", text: i18n.t("Yes") },
        ];
    }, []);

    const setValues = React.useCallback(
        (dataElementIds: Id[], isSet: boolean) => {
            const options = { dataElementsSet, sectorId, dataElementIds, isSet };
            const { selectionInfo, project: newProject } = project.setCovid19(options);
            showSelectionMessage(snackbar, selectionInfo);
            onChange(newProject);
        },
        [onChange, project, sectorId, dataElementsSet, snackbar]
    );

    const customColumns = React.useMemo(() => {
        return [
            {
                name: "categoryCombo" as const,
                text: i18n.t("Disaggregation"),
                sortable: true,
                getValue: function getValue(dataElement: DataElement) {
                    const values = [dataElement, ...dataElement.pairedDataElements].map(de => (
                        <div key={dataElement.id} style={{ width: 150 }}>
                            {de.categoryCombo.displayName}
                        </div>
                    ));
                    const key = dataElement.categoryCombo.id;
                    return <React.Fragment key={key}>{renderJoin(values, <></>)}</React.Fragment>;
                },
            },
            {
                name: "isCovid19" as const,
                text: i18n.t("COVID-19"),
                sortable: true,
                getValue: function getValue(dataElement: DataElement) {
                    return (
                        <Covid19Column
                            key={dataElement.categoryCombo.id + "-" + dataElement.id}
                            project={project}
                            dataElement={dataElement}
                            items={disaggregationItems}
                            onChange={setValues}
                        />
                    );
                },
            },
        ];
    }, [disaggregationItems, project, setValues]);

    const actions = React.useMemo(() => {
        return [
            {
                name: "set-covid19",
                icon: <LocalHospitalIcon />,
                text: i18n.t("Add COVID-19 disaggregation"),
                multiple: true,
                onClick: (ids: Id[]) => setValues(ids, true),
                primary: false,
            },
            {
                name: "unset-covid19",
                icon: <NotInterestedIcon />,
                text: i18n.t("Remove COVID-19 disaggregation"),
                multiple: true,
                primary: false,
                onClick: (ids: Id[]) => setValues(ids, false),
            },
        ];
    }, [setValues]);

    return (
        <SectionsSidebar items={items} sectorId={sectorId} setSector={setSector}>
            <DataElementsTable
                project={project}
                onSectorsMatchChange={onSectorsMatchChange}
                dataElementsSet={dataElementsSet}
                sectorId={sectorId}
                onlySelected={true}
                showGuidance={false}
                columns={initialColumns}
                visibleFilters={visibleFilters}
                customColumns={customColumns}
                actions={actions}
            />
        </SectionsSidebar>
    );
};

const Covid19Column: React.FC<{
    project: Project;
    dataElement: DataElement;
    items: DropdownProps["items"];
    onChange(dataElementId: Id[], newValue: boolean): void;
}> = props => {
    const { project, dataElement, items, onChange } = props;
    const setValue = React.useCallback(
        (newValue: string | undefined) => {
            onChange([dataElement.id], newValue === "true");
        },
        [onChange, dataElement.id]
    );

    const value = project.disaggregation.isCovid19(dataElement.id);

    return (
        <Dropdown
            onChange={setValue}
            items={items}
            value={value.toString()}
            hideEmpty={true}
            id={`covid19-selector-${dataElement.code}`}
        />
    );
};

const initialColumns: FieldName[] = ["name", "code", "indicatorType", "peopleOrBenefit", "series"];
const visibleFilters: FilterKey[] = ["indicatorType"];

export default React.memo(DisaggregationStep);

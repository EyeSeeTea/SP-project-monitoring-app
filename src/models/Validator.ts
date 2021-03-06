import _ from "lodash";
import { D2Api } from "../types/d2-api";

import { RecurringValidator } from "./validators/RecurringValidator";
import { ActualValidator } from "./validators/ActualValidator";
import Project, { DataSetType } from "./Project";
import { DataValue, ValidationItem, ValidationResult } from "./validators/validator-common";

interface Validators {
    actual: ActualValidator;
    recurring: RecurringValidator;
}

export class Validator {
    constructor(private period: string, private validators: Validators) {}

    static async build(
        api: D2Api,
        project: Project,
        dataSetType: DataSetType,
        period: string
    ): Promise<Validator> {
        const validators = {
            actual: await ActualValidator.build(api, project, dataSetType, period),
            recurring: await RecurringValidator.build(api, project, dataSetType, period),
        };
        return new Validator(period, validators);
    }

    async validateDataValue(dataValue0: Omit<DataValue, "period">): Promise<ValidationResult> {
        const dataValue: DataValue = { ...dataValue0, period: this.period };
        const items: ValidationItem[] = _.concat(
            this.validators.actual.validate(dataValue),
            await this.validators.recurring.validate(dataValue)
        );

        return _(items)
            .groupBy(([key, _msg]) => key)
            .mapValues(pairs => pairs.map(([_key, msg]) => msg))
            .value();
    }
}

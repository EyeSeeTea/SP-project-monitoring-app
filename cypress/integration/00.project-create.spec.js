import moment from "moment";
import { selectInMultiSelector, selectDatePicker, selectOrgUnit } from "../support/utils";

describe("Projects - Create", () => {
    before(() => {
        cy.login("admin");
        cy.loadPage();
        cy.contains("Create Project").click();
    });

    it("gets data from the user and creates a project", () => {
        cy.contains("New project");

        // General Info step
        cy.waitForStep("General info");

        cy.contains("Next").click();
        cy.contains("Name cannot be blank");
        cy.contains("Start Date cannot be blank");
        cy.contains("End Date cannot be blank");
        cy.contains("Award Number should be a number of 5 digits");
        cy.contains("Subsequent Lettering must be a string of two letters only");

        cy.get("[data-field='name']").type("00Cypress Project");
        cy.get("[data-field='description']").type("Some description");
        cy.get("[data-field='awardNumber']").type(Math.floor(10000 + Math.random() * 90000));
        cy.get("[data-field='subsequentLettering']").type("SL");

        cy.contains("Start Date").click({ force: true });
        const projectYear = moment().year() + 1;
        selectDatePicker(projectYear, "Feb");

        cy.contains("End Date").click({ force: true });
        selectDatePicker(projectYear, "Jun");

        // Funders

        cy.contains("Funders");
        selectInMultiSelector("funders", "ACWME - ACWME");

        cy.contains("Next").click();

        // Organisation Unit Step

        cy.waitForStep("Country & Project Locations");
        cy.contains("Next").click();
        cy.contains("One Organisation Unit should be selected");

        selectOrgUnit("Bahamas");
        cy.contains("Next").click();

        cy.contains("Select at least one item for Project Locations");
        selectInMultiSelector("locations", "Abaco");
        cy.contains("Next").click();

        // Sectors and Location

        cy.waitForStep("Sectors");

        cy.contains("Next").click();
        cy.contains("Select at least one item for Sectors");

        selectInMultiSelector("sectors", "Agriculture");
        selectInMultiSelector("sectors", "Livelihood");

        cy.contains("Next").click();

        // Selection of Indicators

        cy.waitForStep("Selection of Indicators");

        cy.contains("# of agriculture groups receiving support for improved livelihoods")
            .parent("td")
            .prev("td")
            .click();

        cy.contains("Livelihood").click();
        cy.contains("# of people trained in livelihood topics")
            .parent("td")
            .prev("td")
            .click();

        cy.contains("Next").click();

        // Selection of MER Indicators

        cy.waitForStep("Selection of MER Indicators");

        cy.contains("Livelihood").click();
        cy.contains("# of people trained in livelihood topics")
            .parent("td")
            .prev("td")
            .click();

        cy.contains("Next").click();

        // Sharing

        cy.waitForStep("Sharing");
        cy.contains("System Admin");
        cy.contains("Project Monitoring Admin");
        cy.contains("Country Admin Bahamas");
        cy.contains("Next").click();

        // Save step

        cy.waitForStep("Summary and Save");
        cy.get("[data-test-current=true]").contains("Save");

        cy.contains("Name");
        cy.contains("00Cypress Project");

        cy.contains("Period dates");
        cy.contains(`February ${projectYear} - June ${projectYear}`);

        cy.contains("Description");

        cy.contains("Selected country");
        cy.contains("Bahamas");

        cy.contains("Locations");
        cy.contains("Abaco");

        cy.contains("Sectors");
        cy.contains("Agriculture");
        cy.contains("Livelihood");

        cy.contains("# of agriculture groups receiving support for improved livelihoods - B010200");
        cy.contains("# of people trained in livelihood topics - P020100 [MER]");

        cy.server()
            .route({ method: "post", url: "/api/email/notification*" })
            .as("sendEmail");

        cy.get("[data-wizard-contents] button")
            .contains("Save")
            .click();

        cy.contains("Project created", { timeout: 30000 });
        cy.wait("@sendEmail", { timeout: 20000 });
    });
});
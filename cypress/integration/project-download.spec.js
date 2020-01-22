import ExcelJS from "exceljs";
import { Worksheet } from "exceljs";

describe("Download project", () => {
    beforeEach(() => {
        cy.login("admin");
        cy.loadPage();
        cy.contains("00Cypress Project").trigger("contextmenu");
        cy.contains("Download").click();
    });

    it("should download xlsx file with tabs", async () => {
        const anchor = await cy.get("a#download-file");

        const workbook = await new Cypress.Promise(resolve => {
            const xhr = new XMLHttpRequest();
            const url = anchor.prop("href");
            xhr.open("GET", url, true);
            xhr.responseType = "blob";

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    const blob = xhr.response;
                    const buffer = await blob.arrayBuffer();
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(buffer);
                    resolve(workbook);
                }
            };

            xhr.send();
        });

        expect(workbook.getWorksheet("Benefit")).to.not.be.undefined;
        expect(workbook.getWorksheet("People")).to.not.be.undefined;
    });
});

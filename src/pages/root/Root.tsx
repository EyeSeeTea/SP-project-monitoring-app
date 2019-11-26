import React from "react";
import { Route, Switch, HashRouter } from "react-router-dom";
import LandingPage from "../landing-page/LandingPage";
import ProjectsList from "../projects-list/ProjectsList";
import Report from "../report/Report";
import ActualValues from "../actual-values/ActualValues";
import TargetValues from "../target-values/TargetValues";
import Dashboard from "../dashboard/Dashboard";
import { generateUrl } from "../../router";
import ProjectWizard from "../project-wizard/ProjectWizard";

const Root = () => {
    return (
        <HashRouter>
            <Switch>
                <Route path={generateUrl("projects.new")} render={() => <ProjectWizard />} />
                <Route path={generateUrl("projects")} render={() => <ProjectsList />} />
                <Route path={generateUrl("report")} render={() => <Report />} />
                <Route path={generateUrl("actualValues")} render={() => <ActualValues />} />
                <Route path={generateUrl("targetValues")} render={() => <TargetValues />} />
                <Route path={generateUrl("dashboard")} render={() => <Dashboard />} />
                <Route render={() => <LandingPage />} />
            </Switch>
        </HashRouter>
    );
};

export default Root;

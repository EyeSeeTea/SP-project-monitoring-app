import React from "react";
import { LinearProgress } from "@material-ui/core";
import { useHistory } from "react-router";
//@ts-ignore
import { useConfig } from "@dhis2/app-runtime";

import i18n from "../../locales";
import PageHeader from "../../components/page-header/PageHeader";
import { History } from "history";

function goTo(history: History, url: string) {
    history.push(url);
}

function getTranslations(name: string) {
    return {
        title: i18n.t("Dashboard") + ": " + name,
        help: i18n.t(`Data updates in the dashboards every 15 minutes.  If you do not see your data immediately after data entry, please give the system additional time to update.

        If you notice data errors while viewing the dashboards, please return to the home screen and edit the data under the data entry sections for your project.`),
        subtitle: i18n.t(`Loading dashboard to analyse your data...`),
    };
}

export interface DashboardProps {
    id: string;
    name: string;
    backUrl: string;
}

interface State {
    type: "loading" | "loaded";
    height: number;
}

const Dashboard: React.FC<DashboardProps> = props => {
    const { id, name, backUrl } = props;

    const history = useHistory();
    const { baseUrl } = useConfig();
    const [state, setState] = React.useState<State>({ type: "loading", height: 10000 });
    const iframeRef: React.RefObject<HTMLIFrameElement> = React.createRef();

    const dashboardUrlBase = `${baseUrl}/dhis-web-dashboard`;
    const dashboardUrl = dashboardUrlBase + `/#/${id}`;
    const translations = getTranslations(name);
    const goToBackUrl = React.useCallback(() => goTo(history, backUrl), [history, backUrl]);

    React.useEffect(() => {
        const iframe = iframeRef.current;

        if (iframe !== null) {
            iframe.addEventListener("load", () => {
                setDashboardStyling(iframe).then(() => {
                    setState(prevState => ({ ...prevState, type: "loaded" }));
                });
            });
            const intervalId = autoResizeIframeByContent(iframe, height =>
                setState(prevState => ({ ...prevState, height }))
            );
            return () => window.clearInterval(intervalId);
        }
    }, [iframeRef]);

    const isLoading = state.type === "loading";

    return (
        <React.Fragment>
            <PageHeader
                title={translations.title}
                help={translations.help}
                onBackClick={goToBackUrl}
            />

            {isLoading && (
                <React.Fragment>
                    <div style={styles.subtitle}>{translations.subtitle}</div>
                    <LinearProgress />
                </React.Fragment>
            )}

            <div style={isLoading ? styles.wrapperHidden : styles.wrapperVisible}>
                <iframe
                    ref={iframeRef}
                    id="iframe"
                    title={translations.title}
                    src={dashboardUrl}
                    height={state.height}
                    style={styles.iframe}
                />
            </div>
        </React.Fragment>
    );
};

const styles = {
    iframe: { width: "100%", border: 0, overflow: "hidden" },
    wrapperVisible: {},
    wrapperHidden: { visibility: "hidden" },
    subtitle: { marginBottom: 10, marginLeft: 15 },
};

type IntervalId = number;

function autoResizeIframeByContent(
    iframe: HTMLIFrameElement,
    setHeight: (height: number) => void
): IntervalId {
    const resize = () => {
        const body = iframe?.contentWindow?.document?.body;
        if (iframe && body) {
            const height = body.scrollHeight;
            if (height > 0) setHeight(height);
        }
    };
    return window.setInterval(resize, 1000);
}

function waitforElementToLoad(iframeDocument: HTMLDocument, selector: string) {
    return new Promise(resolve => {
        const check = () => {
            if (iframeDocument.querySelector(selector)) {
                resolve();
            } else {
                setTimeout(check, 1000);
            }
        };
        check();
    });
}

async function setDashboardStyling(iframe: HTMLIFrameElement) {
    if (!iframe.contentWindow) return;
    const iframeDocument = iframe.contentWindow.document;

    await waitforElementToLoad(iframeDocument, ".app-wrapper");
    const iFrameRoot = iframeDocument.querySelector<HTMLElement>("#root");
    const iFrameWrapper = iframeDocument.querySelector<HTMLElement>(".app-wrapper");
    const pageContainer = iframeDocument.querySelector<HTMLElement>(".page-container-top-margin");

    if (iFrameWrapper?.children[0])
        (iFrameWrapper.children[0] as HTMLElement).style.display = "none";
    if (iFrameWrapper?.children[1])
        (iFrameWrapper.children[1] as HTMLElement).style.display = "none";

    if (pageContainer) pageContainer.style.marginTop = "0px";
    if (iFrameRoot) iFrameRoot.style.marginTop = "0px";
}

export default React.memo(Dashboard);

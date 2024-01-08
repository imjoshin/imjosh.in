import "prismjs/themes/prism-okaidia.css";
import { navigate } from "gatsby";
import { redirects } from "./content/redirects";

export const onRouteUpdate = ({ location }) => {
    for (const redirect of redirects) {
        if (
            redirect.from === location.pathname ||
            `${redirect.from}/` === location.pathname
        ) {
            navigate(redirect.to);
        }
    }
};
import React from "react";
import { FaFacebook, FaInstagram, FaGithub, FaTwitter } from "react-icons/fa";
import * as styles from "./Socials.module.css";
import clsx from "clsx";

// TODO pull into Gatsby data layer
const socials = [
    {
        Icon: FaGithub,
        url: "https://github.com/imjoshin",
    },
    {
        Icon: FaInstagram,
        url: "https://www.instagram.com/imjosh.in",
    },
    {
        Icon: FaTwitter,
        url: "https://www.twitter.com/imjosh_in",
    },
    {
        Icon: FaFacebook,
        url: "https://www.facebook.com/www.imjosh.in",
    },
];

interface SocialsProps {
    className?: string;
}

export const Socials = ({ className }: SocialsProps) => {
    return (
        <div className={clsx(styles.socials, className)}>
            {socials.map(({ Icon, url }) => (
                <a href={url} target="_blank">
                    <Icon />
                </a>
            ))}
        </div>
    );
};
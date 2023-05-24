import { StaticImage } from "gatsby-plugin-image";
import React from "react";
import { SpeechBubble } from "../speech-bubble/SpeechBubble";
import * as styles from "./Hero.module.css";
import { Socials } from "./socials/Socials";
import useDarkMode from "use-dark-mode";

export const Hero = () => {
    const darkMode = useDarkMode();

    const image = darkMode.value
        ? <StaticImage
            src="../../images/pixar1.png"
            loading="eager"
            width={175}
            quality={95}
            alt=""
            style={{ transform: 'scaleX(-1)' }}
            placeholder="blurred"
        />
        : <StaticImage
            src="../../images/pixar1-light.png"
            loading="eager"
            width={175}
            quality={95}
            alt=""
            style={{ transform: 'scaleX(-1)' }}
            placeholder="blurred"
        />;

    return (
        <div className={styles.hero}>
            <div className={styles.heroIntro}>
                <div className={styles.heroSpeech}>
                    <SpeechBubble className={styles.heroSpeechComponent}>
                        <p>
                            Hey, I'm Josh! I'm passionate about solving <div className={styles.interesting}>interesting</div> problems
                            and currently work at <a className={styles.workplace} href="https://www.beeper.com" target="_blank">Beeper</a>.
                        </p>
                        <p>
                            Feel free to peruse!
                        </p>
                    </SpeechBubble>
                </div>
                <div className={styles.heroImage}>
                    {image}
                    <Socials className={styles.socials} />
                </div>
            </div>
        </div>
    );
};
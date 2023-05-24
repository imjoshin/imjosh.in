import { StaticImage } from "gatsby-plugin-image";
import React from "react";
import { SpeechBubble } from "../speech-bubble/SpeechBubble";
import * as styles from "./Hero.module.css";

export const Hero = () => {
    return (
        <div className={styles.hero}>
            <div className={styles.heroSpeech}>
                <SpeechBubble className={styles.heroSpeechComponent}>
                    <p>
                        Hey, I'm Josh! I'm passionate about solving interesting problems
                        and currently work at <a href="https://www.beeper.com" target="_blank">Beeper</a>.
                    </p>
                    <p>
                        Feel free to peruse!
                    </p>
                </SpeechBubble>
            </div>
            <StaticImage
                src="../../images/pixar1.png"
                loading="eager"
                width={175}
                quality={95}
                alt=""
                style={{ transform: 'scaleX(-1)' }}
                placeholder="blurred"
                className={styles.heroImage}
            />
        </div>
    );
};
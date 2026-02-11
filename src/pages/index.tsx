import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HeroSection() {
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={styles.heroTitle}>
          Hi, I'm Aden Ang
        </Heading>
        <p className={styles.heroSubtitle}>
          Full-Stack Software Engineer
        </p>
        <p className={styles.heroDescription}>
          I build robust, scalable applications across the stack — from crafting
          intuitive frontends with React and TypeScript to designing reliable
          backends with Python, Django, and FastAPI. Currently working in tech
          consulting, where I solve diverse technical challenges across
          industries.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/blog">
            Read My Blog
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/intro">
            View Projects
          </Link>
        </div>
      </div>
    </header>
  );
}

const highlights = [
  {
    title: 'Full-Stack Development',
    description:
      'End-to-end application development with TypeScript, React, and Node on the frontend, paired with Python, Django, and FastAPI on the backend.',
  },
  {
    title: 'Tech Consulting',
    description:
      'Experience delivering solutions across varied domains, adapting quickly to new business contexts and technical requirements.',
  },
  {
    title: 'Continuous Learning',
    description:
      'Passionate about staying current with modern engineering practices and sharing what I learn through writing and open-source contributions.',
  },
];

function HighlightsSection() {
  return (
    <section className={styles.highlights}>
      <div className="container">
        <div className="row">
          {highlights.map((item, idx) => (
            <div key={idx} className={clsx('col col--4')}>
              <div className={styles.highlightCard}>
                <Heading as="h3">{item.title}</Heading>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <Heading as="h2">Let's Connect</Heading>
        <p>
          I'm always open to discussing new projects, ideas, or opportunities.
          Feel free to reach out.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            href="https://www.linkedin.com/in/junjie2912/">
            Connect on LinkedIn
          </Link>
          <Link
            className="button button--outline button--lg"
            href="https://github.com/aden-ang-jj">
            View My GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="About"
      description="Aden Ang — Full-Stack Software Engineer. Portfolio and technical blog.">
      <HeroSection />
      <main>
        <HighlightsSection />
        <CTASection />
      </main>
    </Layout>
  );
}

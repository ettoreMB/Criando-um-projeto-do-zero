import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiWatch } from 'react-icons/fi';
import Head from 'next/head';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
  totalwords: string;
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  const textBody = post.data.content.map(content => {
    return RichText.asText(content.body).split('').length;
  });

  const reducer = (acumulator, currentValue) => acumulator + currentValue;
  const totalWords = Math.ceil(textBody.reduce(reducer) / 200);

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }
  return (
    <>
      <Head>
        <title>{post.data.title}</title>
      </Head>

      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="" />
      </div>

      <main className={commonStyles.container}>
        <div className={commonStyles.content}>
          <div className={styles.post}>
            <strong>{post.data.title}</strong>
            <div className={commonStyles.info}>
              <div>
                <FiCalendar />
                <time>
                  {format(
                    new Date(post.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </time>
              </div>
              <div>
                <FiUser />
                <span>{post.data.author}</span>
              </div>
              <div>
                <FiWatch />
                {totalWords} Min
              </div>
            </div>

            <article>
              {post.data.content.map(content => (
                <div key={content.heading}>
                  <strong>{content.heading}</strong>

                  <div
                    className={styles.bodyContent}
                    dangerouslySetInnerHTML={{
                      __html: RichText.asText(content.body),
                    }}
                  />
                </div>
              ))}
            </article>
          </div>
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const { results } = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.uid', 'posts.title'],
    }
  );

  const paths = results.map(post => ({
    params: { slug: post.uid },
  }));
  return {
    fallback: true,
    paths,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content,
    },
  };

  return {
    props: { post },
  };
};

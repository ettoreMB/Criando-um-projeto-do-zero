import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiWatch } from 'react-icons/fi';
import Head from 'next/head';
import Link from 'next/link';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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
  readTime: number | null;
}

interface PostProps {
  post: Post;
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({ post, navigation }: PostProps) {
  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((accumulator, content) => {
    accumulator += content.heading.split('').length;

    const words = content.body.map(item => item.text.split('').length);

    words.map(word => (accumulator += word));
    return accumulator;
  }, 0);

  const readTime = Math.ceil(totalWords / 200);

  const editedPost = post.first_publication_date !== post.last_publication_date;

  let editDate;
  if (editedPost) {
    editDate = format(
      new Date(post.last_publication_date),
      "'editado em' dd MMM yyyy', às 'HH':'mm",
      {
        locale: ptBR,
      }
    );
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
            <div className={commonStyles.infoBlock}>
              <div className={styles.infos}>
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
                  {readTime}min
                </div>
              </div>
              <div className={styles.infos}>
                <time>{editDate}</time>
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

          <section className={styles.navPosts}>
            {navigation.nextPost.length > 0 && (
              <div>
                <h3>{navigation.nextPost[0].data.title}</h3>
                <Link href={`/post/${navigation.nextPost[0].uid}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}

            {navigation.prevPost.length > 0 && (
              <div>
                <h3>{navigation.prevPost[0].data.title}</h3>
                <Link href={`/post/${navigation.prevPost[0].uid}`}>
                  <a>Proximo Post</a>
                </Link>
              </div>
            )}
          </section>

          <Comments />
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
    fallback: 'blocking',
    paths,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const prevPost = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

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
    props: {
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
    },
  };
};

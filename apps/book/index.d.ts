/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '*.svg' {
  const content: any;
  export const ReactComponent: any;
  export default content;
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

type Book = {
  id: string;
  title: string;
  image: string;
  author: string;
  size: string;
  desc: string;
  update: string;
};

type FullBook = Book & {
  cata: string;
  status: string;
  txtLink: string;
  rarLink: string;
};

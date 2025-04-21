import { rest } from 'msw';

export const handlers = [
    rest.get('/api/books/modern-development', (req, res, ctx) => {
        return res(
            ctx.json({
                title: "Modern Development",
                author: "Jane Dev",
                content: "Welcome to the world of Modern Development! ...",
            })
        );
    }),
]; 
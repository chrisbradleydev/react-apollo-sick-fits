const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Mutations = {
    // @todo check if user is logged in
    createItem: async (_, args, ctx, info) => {
        const item = await ctx.db.mutation.createItem(
            {
                data: { ...args },
            },
            info
        )

        return item
    },
    updateItem(_, args, ctx, info) {
        const updates = { ...args }

        delete updates.id

        return ctx.db.mutation.updateItem(
            {
                data: updates,
                where: { id: args.id },
            },
            info
        )
    },
    deleteItem: async (_, args, ctx, info) => {
        const where = { id: args.id }
        const item = await ctx.db.query.item({ where }, `{ id, title }`)
        return ctx.db.mutation.deleteItem({ where }, info)
    },
    signup: async (_, args, ctx, info) => {
        args.email = args.email.toLowerCase()
        const password = await bcrypt.hash(args.password, 10)
        const user = await ctx.db.mutation.createUser(
            {
                data: {
                    ...args,
                    password,
                    permissions: { set: ['USER'] },
                },
            },
            info
        )
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
        ctx.response.cookie('token', {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
        })
        return user
    },
    signin: async (_, { email, password }, ctx, info) => {
        const user = await ctx.db.query.user({ where: { email } })
        if (!user) {
            throw new Error(`No user found for email: ${email}`)
        }
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new Error(`Invalid password`)
        }
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
        })
        return user
    },
    signout: (_, args, ctx, info) => {
        ctx.response.clearCookie('token')
        return { message: 'Goodbye!' }
    },
}

module.exports = Mutations

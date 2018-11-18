const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomBytes } = require('crypto')
const { promisify } = require('util')
const { transport, emailTemplate } = require('../mail')
const { hasPermission } = require('../utils')

const Mutations = {
    createItem: async (_, args, ctx, info) => {
        if (!ctx.request.userId) {
            throw new Error(`You must be logged in to do that!`)
        }

        const item = await ctx.db.mutation.createItem(
            {
                data: {
                    // this is how we create a relationship between item and the user
                    user: {
                        connect: {
                            id: ctx.request.userId,
                        },
                    },
                    ...args,
                },
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
        const item = await ctx.db.query.item(
            { where },
            `{ id title user { id }}`
        )

        const ownsItem = item.user.id === ctx.request.userId
        const hasPermissions = ctx.request.user.permissions.some(permission =>
            ['ADMIN', 'ITEMDELETE'].includes(permission)
        )

        if (!ownsItem && !hasPermissions) {
            throw new Error(`You don't have permission to do that!`)
        }

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
    requestReset: async (_, args, ctx, info) => {
        const user = await ctx.db.query.user({ where: { email: args.email } })
        if (!user) {
            throw new Error(`No user found for email: ${args.email}`)
        }
        const randomBytesPromisified = promisify(randomBytes)
        const resetToken = (await randomBytesPromisified(20)).toString('hex')
        const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now
        const res = await ctx.db.mutation.updateUser({
            where: { email: args.email },
            data: { resetToken, resetTokenExpiry },
        })

        // @todo wrap in try catch
        const mailResponse = await transport.sendMail({
            from: 'donotreply@webdev.plus',
            to: user.email,
            subject: 'Your password reset token',
            html: emailTemplate(
                `Your password reset token is here.<br><a href="${
                    process.env.FRONTEND_URL
                }/reset?resetToken=${resetToken}">Click here to reset your password.</a>`
            ),
        })

        return { message: 'Request Sent!' }
    },
    resetPassword: async (_, args, ctx, info) => {
        if (args.password !== args.confirmPassword) {
            throw new Error(`Passwords don't match!`)
        }
        const [user] = await ctx.db.query.users({
            where: {
                resetToken: args.resetToken,
                resetTokenExpiry_gte: Date.now() - 3600000,
            },
        })
        if (!user) {
            throw new Error(`This token is either invalid or has expired.`)
        }
        const password = await bcrypt.hash(args.password, 10)
        const updatedUser = await ctx.db.mutation.updateUser({
            where: { email: user.email },
            data: {
                password,
                resetToken: null,
                resetTokenExpiry: null,
            },
        })
        const token = jwt.sign(
            { userId: updatedUser.id },
            process.env.APP_SECRET
        )
        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
        })
        return updatedUser
    },
    updatePermissions: async (_, args, ctx, info) => {
        if (!ctx.request.userId) {
            throw new Error('You must be logged in!')
        }
        const currentUser = await ctx.db.query.user(
            {
                where: {
                    id: ctx.request.userId,
                },
            },
            info
        )
        hasPermission(currentUser, ['ADMIN', 'PERMISSION_UPDATE'])
        return ctx.db.mutation.updateUser(
            {
                data: {
                    permissions: {
                        set: args.permissions,
                    },
                },
                where: {
                    id: args.userId,
                },
            },
            info
        )
    },
    addToCart: async (_, args, ctx, info) => {
        const { userId } = ctx.request
        if (!userId) {
            throw new Error('You must be signed in dude!')
        }
        const [existingCartItem] = await ctx.db.query.cartItems({
            where: {
                user: { id: userId },
                item: { id: args.id },
            },
        })
        if (existingCartItem) {
            return ctx.db.mutation.updateCartItem(
                {
                    where: { id: existingCartItem.id },
                    data: { quantity: existingCartItem.quantity + 1 },
                },
                info
            )
        }
        return ctx.db.mutation.createCartItem(
            {
                data: {
                    user: {
                        connect: { id: userId },
                    },
                    item: {
                        connect: { id: args.id },
                    },
                },
            },
            info
        )
    },
    removeFromCart: async (_, args, ctx, info) => {
        const cartItem = await ctx.db.query.cartItem(
            {
                where: {
                    id: args.id,
                },
            },
            `{ id, user { id } }`
        )
        if (!cartItem) {
            throw new Error('No cart item found!')
        }
        if (cartItem.user.id !== ctx.request.userId) {
            throw new Error("You don't own that item!")
        }
        return ctx.db.mutation.deleteCartItem(
            {
                where: {
                    id: args.id,
                },
            },
            info
        )
    },
}

module.exports = Mutations

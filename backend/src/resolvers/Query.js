const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const Query = {
    items: forwardTo('db'),
    item: forwardTo('db'),
    itemsConnection: forwardTo('db'),
    me: (_, args, ctx, info) => {
        if (!ctx.request.userId) {
            return null
        }
        return ctx.db.query.user(
            {
                where: { id: ctx.request.userId },
            },
            info
        )
    },
    users: async (_, args, ctx, info) => {
        if (!ctx.request.userId) {
            throw new Error(`You must be logged in!`)
        }
        hasPermission(ctx.request.user, ['ADMIN', 'PERMISSION_UPDATE'])

        return ctx.db.query.users({}, info)
    },
    order: async (_, args, ctx, info) => {
        if (!ctx.request.userId) {
            throw new Error('You must be logged in!')
        }
        const order = await ctx.db.query.order(
            {
                where: { id: args.id },
            },
            info
        )
        const ownsOrder = order.user.id === ctx.request.userId
        const hasPermissionToSeeOrder = ctx.request.user.permissions.includes(
            'ADMIN'
        )
        if (!ownsOrder || !hasPermissionToSeeOrder) {
            throw new Error("You don't have permission to see this order!")
        }
        return order
    },
    orders: async (_, args, ctx, info) => {
        const { userId } = ctx.request
        if (!userId) {
            throw new Error('You must be logged in!')
        }
        return ctx.db.query.orders(
            {
                where: {
                    user: { id: userId },
                },
            },
            info
        )
    },
}

module.exports = Query

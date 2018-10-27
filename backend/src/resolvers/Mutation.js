const Mutations = {
    // @todo check if user is logged in
    createItem: async (_, args, ctx, info) => {
        const item = await ctx.db.mutation.createItem({
            data: { ...args },
        }, info)

        return item
    }
}

module.exports = Mutations

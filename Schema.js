import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList
} from 'graphql';

const Story = new GraphQLObjectType({
  name: 'Story',
  fields: () => ({
    id: {
      type: GraphQLID
    },
    text: {
      type: GraphQLString
    },
    author: {
      type: User,
      resolve(parent, args, {rootValue: {db}}) {
        return db.get(`
          SELECT * FROM User WHERE id = $id
        `, {$id: parent.author});
      }
    }
  })
});

const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: {
      type: GraphQLID
    },
    name: {
      type: GraphQLString
    },
    stories: {
      type: new GraphQLList(Story),
      resolve(user, args, {rootValue: {db, ctx}}) {

        // Check if we are in a users query contexts
        if (undefined !== ctx.usersQuery) {

          // Create a stories query using users ids
          if (undefined === ctx.usersStoriesQuery) {
            // Create a comma separed list of users id
            let userIds = ctx.usersQuery.map(user => user.id).join(', ');
            ctx.usersStoriesQuery = db.all('SELECT * FROM Story WHERE author IN('+userIds+')');
          }

          // Filter out stories not belonging to the current user
          return ctx.usersStoriesQuery.then(stories => {
            return stories.filter(story => story.author === user.id );
          });
        }

        // If not in a users query context, get stories for the current user
        return db.all('SELECT * FROM Story WHERE author = $user', {$user: user.id});
      }
    }
  })
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({

    viewer: {
      type: User,
      resolve(parent, args, {rootValue: {db, userId}}) {
        return db.get(`
          SELECT * FROM User WHERE id = $id
        `, {$id: userId});
      }
    },

    users: {
      type: new GraphQLList(User),
      resolve(parent, args, {rootValue: {db, ctx}}) {

        let users = db.all(`SELECT * FROM User`)

        // Set users query context
        users.then(users => ctx.usersQuery = users);

        return users;
      }
    },

    user: {
      type: User,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        }
      },
      resolve(parent, {id}, {rootValue: {db}}) {
        return db.get(`
          SELECT * FROM User WHERE id = $id
          `, {$id: id});
      }
    },

    story: {
      type: Story,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
        }
      },
      resolve(parent, {id}, {rootValue: {db}}) {
        return db.get(`
          SELECT * FROM Story WHERE id = $id
          `, {$id: id});
      }
    }
  })
});

const Schema = new GraphQLSchema({
  query: Query
});
export default Schema;

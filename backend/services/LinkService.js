class LinkService {
  constructor(knex) {
    this.knex = knex;
  }

  async addLink(link, user_id) {
    console.log("Adding Link");

    // adding title and url into links
    let query = await this.knex
      .insert({
        title: link.title,
        url: link.url,
      })
      .into("links")
      .returning("id")
      .catch((err) => {
        throw new Error(err);
      });

    // adding link_id and user_id into links_users
    await this.knex
      .insert({
        link_id: query[0],
        user_id: user_id,
      })
      .into("links_users")
      .returning("id")
      .catch((err) => {
        throw new Error(err);
      });

    // mapping array of links
    // ensuring that you return the data
    link.tags.map(async (tag) => {
      let query1 = await this.knex
        .select("*")
        .from("tags")
        .where("name", "=", tag.name)
        .then(async (data) => {
          console.log(data, tag.name);
          return data;
        })
        .catch((err) => {
          throw new Error(err);
        });

      //
      if (query1[0] === undefined) {
        // insert tag.name into tags
        await this.knex
          .insert({
            name: tag.name,
          })
          .into("tags")
          .returning("id")
          .then(async (data) => {
            await this.knex
              .insert({
                link_id: query[0],
                tag_id: data[0],
              })
              .into("links_tags")
              .returning("id")
              .catch((err) => {
                throw new Error(err);
              });
          });
      } else {
        // insert link_id and tag_id into links_tags
        await this.knex
          .insert({
            link_id: query[0],
            tag_id: query1[0].id,
          })
          .into("links_tags")
          .returning("id")
          .catch((err) => {
            throw new Error(err);
          });
      }
    });

    // return object with id, user_id as well as link
    return {
      id: query[0],
      ...link,
      user_id,
    };
  }

  async list(search, id) {
    if (search.length > 0) {
      // grab the link id, title, url and link_tag's tag_id and tag's name
      let query = await this.knex
        .select(
          "l.id",
          "l.title",
          "l.url",
          "lt.tag_id",
          "t.name"
        )
        // from the links table
        .from("links as l")
        // joining the links and links_tags table
        .join("links_tags as lt", "lt.link_id", "l.id")
        // joining the tags table
        .join("tags as t", "t.id", "lt.tag_id")
        // joining the links_users table
        .join("links_users as lu", "lu.link_id", "l.id")
        // joining the users table
        .join("users as u", "u.id", "lu.user_id")
        // where the user id matches the passed in id
        .where("u.id", id)
        // and where the specific condition is
        .andWhere((subcondition) =>
          subcondition
            // where the link title contains the search parameter
            .where("l.title", "ilike", `%${search}%`)
            // or where the tag name contains the search parameter
            .orWhere("t.name", "ilike", `%${search}%`)
        );

      // create an array called link array
      let linkArray = [];
      console.log(query);
      let prevLink;

      // loop through the array called query
      for (let i = 0; i < query.length; i++) {
        if (prevLink === undefined) {
          // create a tag query variable
          let tagQuery = await this.knex
            // grabbing the name
            .select("t.name")
            // from the table tags
            .from("tags as t")
            // joining the links_tags table
            .join("links_tags as lt", "lt.tag_id", "t.id")
            // where the link tag id matches the query's id
            .where("lt.link_id", `${query[i].id}`);

          // push into the link array, the query as well as the array of tags
          linkArray.push({
            ...query[i],
            tags: tagQuery,
          });
        } else if (prevLink.title === query[i].title) {
          console.log("matching link");
        } else {
          let tagQuery = await this.knex
            .select("t.name")
            .from("tags as t")
            .join("links_tags as lt", "lt.tag_id", "t.id")
            .where("lt.link_id", `${query[i].id}`);

          linkArray.push({
            ...query[i],
            tags: tagQuery,
          });
        }

        prevLink = query[i];
      }

      console.log(linkArray);

      return linkArray;
    } else {
      console.log("no search");

      // join links_users, grab link_id, id
      // join from users where user id is the id passed in
      let linkQuery = await this.knex
        // grab the id, title, url and user_id
        .select("l.id", "l.title", "l.url", "lu.user_id")
        // from the table links
        .from("links as l")
        // join the links and links_users table
        .join("links_users as lu", "lu.link_id", "l.id")
        // join the users table
        .join("users as u", "u.id", "lu.user_id")
        // grab the specific instance that matches with the id passed in
        .where("u.id", id);

      let newLinks = [];

      // loop through the array of links
      for (let i = 0; i < linkQuery.length; i++) {
        let queryTags = await this.knex
          // grab the tag name
          .select("t.name")
          // from table tags
          .from("tags as t")
          // join tag_id and tag id
          .join("links_tags as lt", "lt.tag_id", "t.id")
          // where the link tag's link_id is equivalent to the id that we loop over
          .where("lt.link_id", `${linkQuery[i].id}`);

        // create an object called link
        let link = {
          // put the link object in
          ...linkQuery[i],
          // as well as the array called tags
          tags: queryTags,
        };

        // push the link into the newLinks array
        newLinks.push(link);
      }

      // return the array of objects
      return newLinks;
    }
  }
}

module.exports = LinkService;

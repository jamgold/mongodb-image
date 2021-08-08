export const TAG_QUERY_SEPARATOR = ','

function unique(value, index, self) {
  return self.indexOf(value) === index;
}

export const tagQuery = function tagQuery(tags) {
  return escape(tags.filter(unique).join(TAG_QUERY_SEPARATOR))
}

export default function createQuery(query, tags) {
  const queryTags = [];
  if (tags && tags.length > 0) {
    tags.forEach((tag) => {
      switch(tag) {
        case 'cssclasses':
          query['cssclasses'] = {$exists:1}
          break
        case 'uncropped':
          query['crop'] = { $exists: 0 }
          break
        case 'private':
          query['$and'] = [
            { private: { $exists: 1 } },
            { private: { $not: {$type: 10} } }
          ]
          break
        case 'missing':
          query['tags'] = { $exists: 0 }
        default:
          queryTags.push(tag)
      }
    })
  }
  if (queryTags.length > 0 && query['tags'] == undefined) {
    query['tags'] = { $all: queryTags }
  }
  return query;
}
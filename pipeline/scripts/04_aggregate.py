from omp.aggregate.common import load_estimates
from omp.aggregate import index_json, headline, atlas, trends, profiles, compendium, meta, flows_json, climate_json, digest
from omp import enpove
est = load_estimates()
from omp import validate
print(validate.run(est).to_string())
print("flows", flows_json.build()); print("climate", climate_json.build()); print("venezuela", enpove.build())
print("headline", headline.build(est)); print("atlas", atlas.build(est)); print("trends", trends.build(est)); print("profiles", len(profiles.build(est)))
print("compendium", len(compendium.build(est))); print("meta", meta.build(est))
print("digest", digest.build(est))

print("index", index_json.build())

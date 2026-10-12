from omp.models import run_all
from omp.build_person import load_person
from omp.derive import derive
from omp import drought
run_all(load_person, derive)
print("drought", drought.build())

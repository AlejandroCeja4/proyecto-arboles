import json
import os
import re
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Arboles")

SAVE_FILE = "save.json"


class Nodo:
    """Nodo de árbol binario que almacena expresiones matemáticas."""

    def __init__(self, valor):
        self.valor = valor
        self.izquierda = None
        self.derecha = None

    def transformar_a_diccionario(self):
        """Convierte el nodo y sus hijos a diccionario."""
        return {
            "valor": self.valor,
            "izquierda": self.izquierda.transformar_a_diccionario()
            if self.izquierda else None,
            "derecha": self.derecha.transformar_a_diccionario()
            if self.derecha else None
        }


def transformar_a_nodo(valor):
    """Convierte un diccionario a estructura de nodos."""
    if not valor:
        return None

    if not isinstance(valor, dict):
        raise ValueError("Estructura inválida en el archivo")

    if "valor" not in valor:
        raise KeyError("Falta la clave 'valor' en los datos")

    nodo = Nodo(valor["valor"])
    nodo.izquierda = transformar_a_nodo(valor.get("izquierda"))
    nodo.derecha = transformar_a_nodo(valor.get("derecha"))
    return nodo


def validar_expresion(expresion):
    """Valida que la expresión sea un monomio válido."""
    if not isinstance(expresion, str):
        raise ValueError("La expresión debe ser texto")

    expresion = expresion.strip()

    if not expresion:
        raise ValueError("La expresión no puede estar vacía")

    patron = r"^([+-]?\d+|[+-]?\d*x(\^\d+)?)$"

    if not re.match(patron, expresion.replace(" ", "")):
        raise ValueError("Formato inválido. Ejemplos válidos: 3x, -2x^2, 5")

    return expresion


def evaluar_monomio(expresion, x):
    """Evalúa un monomio de la forma ax^n o constante."""
    expresion = expresion.replace(" ", "")

    if expresion.isdigit() or (
        expresion.startswith("-") and expresion[1:].isdigit()
    ):
        return int(expresion)

    patron = r"^([+-]?\d*)x(\^(\d+))?$"
    match = re.match(patron, expresion)

    if not match:
        raise ValueError(f"Expresión inválida: {expresion}")

    coef = match.group(1)
    exp = match.group(3)

    if coef in ("", "+"):
        coef = 1
    elif coef == "-":
        coef = -1
    else:
        coef = int(coef)

    exp = int(exp) if exp else 1

    try:
        return coef * (x ** exp)
    except OverflowError:
        raise ValueError("El cálculo es demasiado grande")
    except Exception as error:
        raise ValueError(f"Error al evaluar: {error}") from error


class Arbol:
    """Árbol binario de búsqueda que almacena expresiones."""

    def __init__(self):
        self.raiz = None
        self.cargar()

    def insert(self, valor):
        """Inserta una expresión en el árbol."""
        valor = validar_expresion(valor)

        if not self.raiz:
            self.raiz = Nodo(valor)
            self.guardar()
            return True

        if self._exists(self.raiz, valor):
            return False

        self.insertar_recursivo(self.raiz, valor)
        self.guardar()
        return True

    def _exists(self, actual, valor):
        """Verifica si un valor ya existe en el árbol."""
        if not actual:
            return False
        if actual.valor == valor:
            return True
        if str(valor) < str(actual.valor):
            return self._exists(actual.izquierda, valor)
        return self._exists(actual.derecha, valor)

    def insertar_recursivo(self, actual, valor):
        """Inserta recursivamente en el árbol."""
        if str(valor) < str(actual.valor):
            if actual.izquierda is None:
                actual.izquierda = Nodo(valor)
            else:
                self.insertar_recursivo(actual.izquierda, valor)
        else:
            if actual.derecha is None:
                actual.derecha = Nodo(valor)
            else:
                self.insertar_recursivo(actual.derecha, valor)

    def evaluar_arbol(self, x):
        """Evalúa todas las expresiones del árbol."""
        resultados = []

        def recorrer(nodo):
            if nodo:
                try:
                    valor = evaluar_monomio(nodo.valor, x)
                    resultados.append({
                        "expresion": nodo.valor,
                        "resultado": valor
                    })
                except Exception as error:
                    resultados.append({
                        "expresion": nodo.valor,
                        "error": str(error)
                    })
                recorrer(nodo.izquierda)
                recorrer(nodo.derecha)

        recorrer(self.raiz)
        return resultados

    def guardar(self):
        """Guarda el árbol en un archivo JSON."""
        try:
            valor = (
                self.raiz.transformar_a_diccionario()
                if self.raiz else None
            )
            with open(SAVE_FILE, "w") as file:
                json.dump(valor, file)
        except PermissionError:
            raise IOError("No hay permisos para escribir el archivo")
        except Exception as error:
            raise IOError(f"Error al guardar: {error}") from error

    def cargar(self):
        """Carga el árbol desde un archivo JSON."""
        if not os.path.exists(SAVE_FILE):
            return

        try:
            with open(SAVE_FILE, "r") as file:
                valor = json.load(file)
                self.raiz = transformar_a_nodo(valor)
        except json.JSONDecodeError:
            self.raiz = None
            raise ValueError("El archivo JSON está corrupto")
        except Exception:
            self.raiz = None

    def reiniciar(self):
        """Reinicia el árbol y elimina el archivo guardado."""
        self.raiz = None
        try:
            if os.path.exists(SAVE_FILE):
                os.remove(SAVE_FILE)
        except PermissionError:
            raise IOError("No hay permisos para eliminar el archivo")


arbol = Arbol()


@app.post("/add")
async def add_node(request: Request):
    """Agrega una expresión al árbol."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="El cuerpo de la solicitud debe ser JSON válido"
        )

    if "value" not in data:
        raise HTTPException(
            status_code=400,
            detail="Falta el campo 'value'"
        )

    try:
        valor = str(data["value"])
        if not arbol.insert(valor):
            return {
                "status": "error",
                "message": "El nodo ya existe"
            }
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno: {error}"
        ) from error

    return {
        "status": "success",
        "tree": arbol.raiz.transformar_a_diccionario()
        if arbol.raiz else None
    }


@app.get("/tree")
async def get_tree():
    """Obtiene el árbol actual."""
    try:
        return (
            arbol.raiz.transformar_a_diccionario()
            if arbol.raiz else None
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener el árbol: {error}"
        ) from error


@app.post("/evaluate")
async def evaluate_tree(request: Request):
    """Evalúa el árbol con un valor de x."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="El cuerpo debe ser JSON válido"
        )

    if "x" not in data:
        raise HTTPException(
            status_code=400,
            detail="Falta el valor de 'x'"
        )

    try:
        x = float(data["x"])
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="El valor de 'x' debe ser numérico"
        )

    try:
        resultados = arbol.evaluar_arbol(x)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error al evaluar: {error}"
        ) from error

    return {
        "status": "success",
        "x": x,
        "resultados": resultados
    }


@app.post("/reset")
async def reset_tree():
    """Reinicia el árbol."""
    try:
        arbol.reiniciar()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error al reiniciar: {error}"
        ) from error

    return {"status": "success"}


app.mount("/", StaticFiles(directory="static", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)

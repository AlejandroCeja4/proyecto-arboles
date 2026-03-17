import json
import os
import random
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Arboles")

SAVE_FILE = "save.json"

class Nodo:
    def __init__(self, valor):
        self.valor = valor
        self.izquierda = None
        self.derecha = None

    def transformar_a_diccionario(self):
        return {
            "valor": self.valor,
            "izquierda": self.izquierda.transformar_a_diccionario() if self.izquierda else None,
            "derecha": self.derecha.transformar_a_diccionario() if self.derecha else None
        }

def transformar_a_nodo(valor):
    if not valor:
        return None
    nodo = Nodo(valor["valor"])
    nodo.izquierda = transformar_a_nodo(valor["izquierda"])
    nodo.derecha = transformar_a_nodo(valor["derecha"])
    return nodo

class Arbol:
    def __init__(self):
        self.raiz = None
        self.cargar()

    def insert(self, valor):
        if not self.raiz:
            self.raiz = Nodo(valor)
            self.guardar()
            return True
        else:
            if self._exists(self.raiz, valor):
                return False
            self.insertar_recursivo(self.raiz, valor)
            self.guardar()
            return True

    def _exists(self, actual, valor):
        if not actual:
            return False
        if actual.valor == valor:
            return True
        if valor < actual.valor:
            return self._exists(actual.izquierda, valor)
        else:
            return self._exists(actual.derecha, valor)

    def insertar_recursivo(self, actual, valor):
        if valor < actual.valor:
            if actual.izquierda is None:
                actual.izquierda = Nodo(valor)
            else:
                self.insertar_recursivo(actual.izquierda, valor)
        else:
            if actual.derecha is None:
                actual.derecha = Nodo(valor)
            else:
                self.insertar_recursivo(actual.derecha, valor)

    def guardar(self):
        valor = self.raiz.transformar_a_diccionario() if self.raiz else None
        with open(SAVE_FILE, "w") as f:
            json.dump(valor, f)

    def cargar(self):
        if os.path.exists(SAVE_FILE):
            try:
                with open(SAVE_FILE, "r") as f:
                    valor = json.load(f)
                    self.raiz = transformar_a_nodo(valor)
            except (json.JSONDecodeError, KeyError):
                self.raiz = None

    def reiniciar(self):
        self.raiz = None
        if os.path.exists(SAVE_FILE):
            os.remove(SAVE_FILE)
    def eliminar(self, valor):
        self.raiz = self._eliminar_rec(self.raiz, valor)
        self.guardar()

    def _eliminar_rec(self, nodo, valor):
        if not nodo:
            return nodo

        if valor < nodo.valor:
            nodo.izquierda = self._eliminar_rec(nodo.izquierda, valor)

        elif valor > nodo.valor:
            nodo.derecha = self._eliminar_rec(nodo.derecha, valor)

        else:
            if nodo.izquierda is None:
                return nodo.derecha
            elif nodo.derecha is None:
                return nodo.izquierda

            sucesor = self._min(nodo.derecha)
            nodo.valor = sucesor.valor
            nodo.derecha = self._eliminar_rec(nodo.derecha, sucesor.valor)

        return nodo

    def _min(self,nodo):
        while nodo.izquierda:
            nodo = nodo.izquierda
        return nodo
    def eliminar_subarbol(self, valor):
        def rec(nodo):
            if not nodo:
                return None
            if nodo.valor == valor:
                return None
            nodo.izquierda = rec(nodo.izquierda)
            nodo.derecha = rec(nodo.derecha)
            return nodo

        self.raiz = rec(self.raiz)
        self.guardar()
    def valores(self):
        lista=[]
        def inorder(n):
            if not n: return
            inorder(n.izquierda)
            lista.append(n.valor)
            inorder(n.derecha)
        inorder(self.raiz)
        return lista
    def balancear(self):
        valores=self.valores()

        def construir(arr):
            if not arr:
                return None
            mid=len(arr)//2
            nodo=Nodo(arr[mid])
            nodo.izquierda=construir(arr[:mid])
            nodo.derecha=construir(arr[mid+1:])
            return nodo

        self.raiz=construir(valores)
        self.guardar()

    def aleatorio(self,n=10):
        self.raiz=None
        nums=random.sample(range(1,100),n)
        for i in nums:
            self.insert(i)
    def arbol_expresion(self, expr):

        def precedencia(op):
            if op in ('+', '-'): return 1
            if op in ('*', '/'): return 2
            return 0

        # Convertir a postfijo (Shunting Yard)
        salida = []
        pila = []
        numero = ""

        for c in expr:
            if c.isdigit():
                numero += c
            else:
                if numero:
                    salida.append(numero)
                    numero = ""

                if c == '(':
                    pila.append(c)
                elif c == ')':
                    while pila and pila[-1] != '(':
                        salida.append(pila.pop())
                    pila.pop()
                else:
                    while pila and precedencia(pila[-1]) >= precedencia(c):
                        salida.append(pila.pop())
                    pila.append(c)

        if numero:
            salida.append(numero)

        while pila:
            salida.append(pila.pop())

        # Construir árbol desde postfijo
        stack = []

        for token in salida:
            if token.isdigit():
                stack.append(Nodo(token))
            else:
                nodo = Nodo(token)
                nodo.derecha = stack.pop()
                nodo.izquierda = stack.pop()
                stack.append(nodo)

        self.raiz = stack[0]
arbol = Arbol()

@app.post("/add")
async def add_node(request: Request):
    data = await request.json()
    if "value" not in data:
        raise HTTPException(status_code=400, detail="Missing value")

    valor = int(data["value"])
    if not arbol.insert(valor):
        return {"status": "error", "message": "El nodo ya existe"}
    return {"status": "success", "tree": arbol.raiz.transformar_a_diccionario() if arbol.raiz else None}

@app.get("/tree")
async def get_tree():
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None

@app.post("/reset")
async def reset_tree():
    arbol.reiniciar()
    return {"status": "success"}
@app.post("/delete")
async def delete_node(request:Request):
    data=await request.json()
    arbol.eliminar(int(data["value"]))
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None


@app.post("/subtree")
async def subtree(request:Request):
    data=await request.json()
    arbol.eliminar_subarbol(int(data["value"]))
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None


@app.post("/balance")
async def balance():
    arbol.balancear()
    return arbol.raiz.transformar_a_diccionario() if arbol.raiz else None


@app.post("/random")
async def random_tree():
    arbol.aleatorio()
    return arbol.raiz.transformar_a_diccionario()


@app.post("/expression")
async def expression(request:Request):
    data=await request.json()
    arbol.arbol_expresion(data["expr"])
    return arbol.raiz.transformar_a_diccionario()


@app.post("/load_json")
async def load_json(request:Request):
    data=await request.json()
    arbol.raiz=transformar_a_nodo(data)
    arbol.guardar()
    return arbol.raiz.transformar_a_diccionario()

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
